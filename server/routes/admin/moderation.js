/**
 * ADMIN MODERATION ROUTES
 * Reports and appeals management for admin panel
 */

const express = require('express');
const router = express.Router();
const Report = require('../../models/Report');
const Appeal = require('../../models/Appeal');
const User = require('../../models/User');
const { roleCheck } = require('../../middleware/roleCheck');
const auditLogger = require('../../middleware/auditLogger');

// ============================
// REPORTS
// ============================

/**
 * List reports
 * GET /api/admin/moderation/reports
 */
router.get('/reports', roleCheck('moderation:read'), async (req, res) => {
  try {
    const { status, type, priority, assignedTo, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    const reports = await Report.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('reporterId', 'username walletAddress')
      .populate('assignedTo', 'username')
      .populate('resolvedBy', 'username');

    const total = await Report.countDocuments(query);

    // Get counts by status
    const statusCounts = await Report.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: reports.map(r => ({ ...r.toObject(), id: r._id })),
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        statusCounts: statusCounts.reduce((acc, { _id, count }) => {
          acc[_id] = count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Get report details
 * GET /api/admin/moderation/reports/:reportId
 */
router.get('/reports/:reportId', roleCheck('moderation:read'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.reportId)
      .populate('reporterId', 'username walletAddress')
      .populate('assignedTo', 'username')
      .populate('resolvedBy', 'username');

    if (!report) {
      return res.status(404).json({
        success: false,
        error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' }
      });
    }

    // Get target details
    let target = null;
    if (report.targetType === 'player') {
      target = await User.findById(report.targetId)
        .select('username walletAddress status moderation');
    }

    res.json({
      success: true,
      data: {
        ...report.toObject(),
        id: report._id,
        target
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Assign report
 * POST /api/admin/moderation/reports/:reportId/assign
 */
router.post('/reports/:reportId/assign',
  roleCheck('moderation:resolve'),
  auditLogger('REPORT_ASSIGN', (req) => ({
    type: 'report',
    id: req.params.reportId
  })),
  async (req, res) => {
    try {
      const report = await Report.findByIdAndUpdate(req.params.reportId, {
        $set: {
          assignedTo: req.admin._id,
          status: 'investigating'
        }
      }, { new: true });

      if (!report) {
        return res.status(404).json({
          success: false,
          error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' }
        });
      }

      res.json({ success: true, data: { message: 'Report assigned' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Resolve report
 * POST /api/admin/moderation/reports/:reportId/resolve
 */
router.post('/reports/:reportId/resolve',
  roleCheck('moderation:resolve'),
  auditLogger('REPORT_RESOLVE', (req) => ({
    type: 'report',
    id: req.params.reportId,
    changes: req.body.resolution
  })),
  async (req, res) => {
    try {
      const { resolution } = req.body;

      if (!resolution || !resolution.action) {
        return res.status(400).json({
          success: false,
          error: { code: 'RESOLUTION_REQUIRED', message: 'Resolution action is required' }
        });
      }

      const report = await Report.findByIdAndUpdate(req.params.reportId, {
        $set: {
          status: 'resolved',
          resolvedBy: req.admin._id,
          resolvedAt: new Date(),
          resolution
        }
      }, { new: true });

      if (!report) {
        return res.status(404).json({
          success: false,
          error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' }
        });
      }

      // Apply action to target if needed
      if (resolution.action !== 'no_action' && report.targetType === 'player') {
        // Actions handled by separate endpoints (ban, warn, etc.)
      }

      res.json({ success: true, data: { message: 'Report resolved' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Dismiss report
 * POST /api/admin/moderation/reports/:reportId/dismiss
 */
router.post('/reports/:reportId/dismiss',
  roleCheck('moderation:resolve'),
  auditLogger('REPORT_DISMISS', (req) => ({
    type: 'report',
    id: req.params.reportId,
    changes: { reason: req.body.reason }
  })),
  async (req, res) => {
    try {
      const { reason } = req.body;

      const report = await Report.findByIdAndUpdate(req.params.reportId, {
        $set: {
          status: 'dismissed',
          resolvedBy: req.admin._id,
          resolvedAt: new Date(),
          resolution: {
            action: 'no_action',
            reason: reason || 'Report dismissed'
          }
        }
      }, { new: true });

      if (!report) {
        return res.status(404).json({
          success: false,
          error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' }
        });
      }

      res.json({ success: true, data: { message: 'Report dismissed' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

// ============================
// APPEALS
// ============================

/**
 * List appeals
 * GET /api/admin/moderation/appeals
 */
router.get('/appeals', roleCheck('appeals:read'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const appeals = await Appeal.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('userId', 'username walletAddress')
      .populate('bannedBy', 'username')
      .populate('reviewedBy', 'username');

    const total = await Appeal.countDocuments(query);

    res.json({
      success: true,
      data: appeals.map(a => ({ ...a.toObject(), id: a._id })),
      meta: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Get appeal details
 * GET /api/admin/moderation/appeals/:appealId
 */
router.get('/appeals/:appealId', roleCheck('appeals:read'), async (req, res) => {
  try {
    const appeal = await Appeal.findById(req.params.appealId)
      .populate('userId', 'username walletAddress moderation')
      .populate('bannedBy', 'username')
      .populate('reviewedBy', 'username');

    if (!appeal) {
      return res.status(404).json({
        success: false,
        error: { code: 'APPEAL_NOT_FOUND', message: 'Appeal not found' }
      });
    }

    res.json({
      success: true,
      data: {
        ...appeal.toObject(),
        id: appeal._id
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Review appeal
 * POST /api/admin/moderation/appeals/:appealId/review
 */
router.post('/appeals/:appealId/review',
  roleCheck('appeals:decide'),
  auditLogger('APPEAL_REVIEW', (req) => ({
    type: 'appeal',
    id: req.params.appealId,
    changes: req.body
  })),
  async (req, res) => {
    try {
      const { decision, reviewNotes } = req.body;

      if (!decision || !decision.action) {
        return res.status(400).json({
          success: false,
          error: { code: 'DECISION_REQUIRED', message: 'Decision action is required' }
        });
      }

      const appeal = await Appeal.findByIdAndUpdate(req.params.appealId, {
        $set: {
          status: decision.action === 'overturned' ? 'approved' : 'rejected',
          reviewedBy: req.admin._id,
          reviewedAt: new Date(),
          reviewNotes,
          decision
        }
      }, { new: true });

      if (!appeal) {
        return res.status(404).json({
          success: false,
          error: { code: 'APPEAL_NOT_FOUND', message: 'Appeal not found' }
        });
      }

      // Apply decision
      if (decision.action === 'overturned') {
        // Unban the user
        await User.findByIdAndUpdate(appeal.userId, {
          $set: {
            'moderation.isBanned': false,
            'moderation.banUntil': null,
            'moderation.isPermanentBan': false
          }
        });
      } else if (decision.action === 'reduced' && decision.newDuration) {
        // Reduce ban duration
        const newBanUntil = new Date(Date.now() + decision.newDuration * 24 * 60 * 60 * 1000);
        await User.findByIdAndUpdate(appeal.userId, {
          $set: {
            'moderation.banUntil': newBanUntil
          }
        });
      }

      res.json({ success: true, data: { message: 'Appeal reviewed' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

module.exports = router;
