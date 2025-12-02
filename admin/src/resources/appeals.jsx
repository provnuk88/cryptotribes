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
import GavelIcon from '@mui/icons-material/Gavel';

import { adminActions } from '../dataProvider';

const AppealStatusChip = () => {
  const record = useRecordContext();
  if (!record) return null;

  const colors = {
    pending: 'warning',
    reviewing: 'info',
    approved: 'success',
    rejected: 'error',
  };

  return (
    <Chip
      label={record.status?.toUpperCase()}
      color={colors[record.status] || 'default'}
      size="small"
    />
  );
};

const AppealActions = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState({ action: 'upheld', newDuration: 0 });
  const [notes, setNotes] = useState('');

  if (!record) return null;

  if (record.status === 'approved' || record.status === 'rejected') {
    return <Chip label="Reviewed" size="small" />;
  }

  const handleReview = async () => {
    try {
      await adminActions.reviewAppeal(record.id, decision, notes);
      notify('Appeal reviewed', { type: 'success' });
      setOpen(false);
      refresh();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  return (
    <>
      <Button
        label="Review"
        onClick={() => setOpen(true)}
        startIcon={<GavelIcon />}
        color="primary"
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Review Appeal</DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <strong>Player:</strong> {record.userId?.username}
          </Box>
          <Box mb={2}>
            <strong>Ban Reason:</strong> {record.originalBanReason}
          </Box>
          <Box mb={2}>
            <strong>Appeal Reason:</strong> {record.appealReason}
          </Box>

          <FormControl fullWidth margin="normal">
            <InputLabel>Decision</InputLabel>
            <Select
              value={decision.action}
              onChange={(e) => setDecision({ ...decision, action: e.target.value })}
              label="Decision"
            >
              <MenuItem value="upheld">Uphold Ban</MenuItem>
              <MenuItem value="reduced">Reduce Ban Duration</MenuItem>
              <MenuItem value="overturned">Overturn Ban</MenuItem>
            </Select>
          </FormControl>

          {decision.action === 'reduced' && (
            <FormControl fullWidth margin="normal">
              <InputLabel>New Duration (days)</InputLabel>
              <Select
                value={decision.newDuration}
                onChange={(e) => setDecision({ ...decision, newDuration: e.target.value })}
                label="New Duration (days)"
              >
                <MenuItem value={1}>1 day</MenuItem>
                <MenuItem value={3}>3 days</MenuItem>
                <MenuItem value={7}>7 days</MenuItem>
                <MenuItem value={14}>14 days</MenuItem>
              </Select>
            </FormControl>
          )}

          <MuiTextField
            label="Review Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)}>Cancel</MuiButton>
          <MuiButton onClick={handleReview} color="primary" variant="contained">
            Submit Decision
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export const AppealList = () => (
  <List sort={{ field: 'createdAt', order: 'DESC' }}>
    <Datagrid rowClick="show">
      <TextField source="userId.username" label="Player" />
      <TextField source="originalBanReason" label="Ban Reason" />
      <AppealStatusChip source="status" label="Status" />
      <TextField source="reviewedBy.username" label="Reviewed By" />
      <DateField source="createdAt" label="Submitted" />
      <AppealActions />
    </Datagrid>
  </List>
);

export const AppealShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="userId.username" label="Player" />
      <TextField source="userId.walletAddress" label="Player Wallet" />
      <TextField source="originalBanReason" label="Original Ban Reason" />
      <DateField source="banDate" label="Ban Date" />
      <TextField source="appealReason" label="Appeal Reason" />
      <AppealStatusChip source="status" />
      <TextField source="decision.action" label="Decision" />
      <TextField source="reviewNotes" label="Review Notes" />
      <TextField source="reviewedBy.username" label="Reviewed By" />
      <DateField source="reviewedAt" label="Reviewed At" />
      <DateField source="createdAt" label="Submitted" />
    </SimpleShowLayout>
  </Show>
);
