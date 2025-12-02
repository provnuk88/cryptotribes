/**
 * ADMIN AUDIT LOGS ROUTES
 * View audit logs for admin actions
 */

const express = require('express');
const router = express.Router();
const AdminAuditLog = require('../../models/AdminAuditLog');
const { roleCheck, requireRole } = require('../../middleware/roleCheck');

/**
 * List audit logs
 * GET /api/admin/audit-logs
 */
router.get('/', async (req, res) => {
  try {
    const {
      adminId,
      action,
      targetType,
      targetId,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    // Non-super admins can only see their own logs
    const query = {};
    if (req.admin.role !== 'super_admin') {
      query.adminId = req.admin._id;
    } else if (adminId) {
      query.adminId = adminId;
    }

    if (action) query.action = new RegExp(action, 'i');
    if (targetType) query['target.type'] = targetType;
    if (targetId) query['target.id'] = targetId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AdminAuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('adminId', 'username role');

    const total = await AdminAuditLog.countDocuments(query);

    res.json({
      success: true,
      data: logs.map(l => ({ ...l.toObject(), id: l._id })),
      meta: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Get audit log details
 * GET /api/admin/audit-logs/:logId
 */
router.get('/:logId', async (req, res) => {
  try {
    const log = await AdminAuditLog.findById(req.params.logId)
      .populate('adminId', 'username role email');

    if (!log) {
      return res.status(404).json({
        success: false,
        error: { code: 'LOG_NOT_FOUND', message: 'Audit log not found' }
      });
    }

    // Non-super admins can only see their own logs
    if (req.admin.role !== 'super_admin' && log.adminId._id.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot view other admins\' logs' }
      });
    }

    res.json({
      success: true,
      data: { ...log.toObject(), id: log._id }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Get audit statistics
 * GET /api/admin/audit-logs/stats/summary
 */
router.get('/stats/summary', requireRole('super_admin'), async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Actions by type
    const actionsByType = await AdminAuditLog.aggregate([
      { $match: { timestamp: { $gte: dateFilter } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Actions by admin
    const actionsByAdmin = await AdminAuditLog.aggregate([
      { $match: { timestamp: { $gte: dateFilter } } },
      { $group: { _id: '$adminId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Actions per day
    const actionsPerDay = await AdminAuditLog.aggregate([
      { $match: { timestamp: { $gte: dateFilter } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        actionsByType,
        actionsByAdmin,
        actionsPerDay
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Export audit logs (Super Admin only)
 * GET /api/admin/audit-logs/export
 */
router.get('/export/csv', requireRole('super_admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AdminAuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(10000)
      .populate('adminId', 'username role');

    // Generate CSV
    const csvHeader = 'Timestamp,Admin,Role,Action,Target Type,Target ID,Result\n';
    const csvRows = logs.map(log => {
      return [
        log.timestamp.toISOString(),
        log.adminId?.username || log.adminUsername || 'Unknown',
        log.adminRole,
        log.action,
        log.target?.type || '',
        log.target?.id || '',
        log.result || ''
      ].join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
    res.send(csvHeader + csvRows);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

module.exports = router;
