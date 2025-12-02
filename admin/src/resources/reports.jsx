import React, { useState } from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Show,
  SimpleShowLayout,
  useRecordContext,
  useNotify,
  useRefresh,
  Button,
} from 'react-admin';
import {
  Chip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button as MuiButton,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import { adminActions } from '../dataProvider';

const ReportStatusChip = () => {
  const record = useRecordContext();
  if (!record) return null;

  const colors = {
    pending: 'warning',
    investigating: 'info',
    resolved: 'success',
    dismissed: 'default',
  };

  return (
    <Chip
      label={record.status?.toUpperCase()}
      color={colors[record.status] || 'default'}
      size="small"
    />
  );
};

const PriorityChip = () => {
  const record = useRecordContext();
  if (!record) return null;

  const colors = {
    low: 'default',
    medium: 'info',
    high: 'warning',
    critical: 'error',
  };

  return (
    <Chip
      label={record.priority?.toUpperCase()}
      color={colors[record.priority] || 'default'}
      size="small"
      variant="outlined"
    />
  );
};

const ReportActions = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolution, setResolution] = useState({ action: 'warning', reason: '' });

  if (!record) return null;

  const handleAssign = async () => {
    try {
      await adminActions.assignReport(record.id);
      notify('Report assigned to you', { type: 'success' });
      refresh();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  const handleResolve = async () => {
    try {
      await adminActions.resolveReport(record.id, resolution);
      notify('Report resolved', { type: 'success' });
      setResolveOpen(false);
      refresh();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  const handleDismiss = async () => {
    try {
      await adminActions.resolveReport(record.id, { action: 'no_action', reason: 'Dismissed' });
      notify('Report dismissed', { type: 'success' });
      refresh();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  if (record.status === 'resolved' || record.status === 'dismissed') {
    return <Chip label="Closed" size="small" />;
  }

  return (
    <Box display="flex" gap={1}>
      {record.status === 'pending' && (
        <Button
          label="Assign"
          onClick={handleAssign}
          startIcon={<AssignmentIcon />}
          size="small"
        />
      )}
      {record.status === 'investigating' && (
        <>
          <Button
            label="Resolve"
            onClick={() => setResolveOpen(true)}
            startIcon={<CheckIcon />}
            color="success"
            size="small"
          />
          <Button
            label="Dismiss"
            onClick={handleDismiss}
            startIcon={<CloseIcon />}
            size="small"
          />
        </>
      )}

      <Dialog open={resolveOpen} onClose={() => setResolveOpen(false)}>
        <DialogTitle>Resolve Report</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Action</InputLabel>
            <Select
              value={resolution.action}
              onChange={(e) => setResolution({ ...resolution, action: e.target.value })}
              label="Action"
            >
              <MenuItem value="no_action">No Action</MenuItem>
              <MenuItem value="warning">Issue Warning</MenuItem>
              <MenuItem value="mute">Mute Player</MenuItem>
              <MenuItem value="temp_ban">Temporary Ban</MenuItem>
              <MenuItem value="perm_ban">Permanent Ban</MenuItem>
            </Select>
          </FormControl>
          <MuiTextField
            label="Resolution Notes"
            value={resolution.reason}
            onChange={(e) => setResolution({ ...resolution, reason: e.target.value })}
            fullWidth
            multiline
            rows={3}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setResolveOpen(false)}>Cancel</MuiButton>
          <MuiButton onClick={handleResolve} color="success" variant="contained">
            Resolve Report
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export const ReportList = () => (
  <List sort={{ field: 'createdAt', order: 'DESC' }}>
    <Datagrid rowClick="show">
      <TextField source="type" label="Type" />
      <TextField source="reporterId.username" label="Reporter" />
      <TextField source="targetType" label="Target Type" />
      <ReportStatusChip source="status" label="Status" />
      <PriorityChip source="priority" label="Priority" />
      <TextField source="assignedTo.username" label="Assigned To" />
      <DateField source="createdAt" label="Submitted" />
      <ReportActions />
    </Datagrid>
  </List>
);

export const ReportShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="type" />
      <TextField source="description" />
      <TextField source="reporterId.username" label="Reporter" />
      <TextField source="targetType" label="Target Type" />
      <TextField source="targetId" label="Target ID" />
      <ReportStatusChip source="status" />
      <PriorityChip source="priority" />
      <TextField source="assignedTo.username" label="Assigned To" />
      <TextField source="resolution.action" label="Resolution Action" />
      <TextField source="resolution.reason" label="Resolution Notes" />
      <TextField source="resolvedBy.username" label="Resolved By" />
      <DateField source="resolvedAt" label="Resolved At" />
      <DateField source="createdAt" label="Submitted" />
    </SimpleShowLayout>
  </Show>
);
