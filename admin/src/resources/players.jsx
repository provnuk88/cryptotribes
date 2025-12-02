import React, { useState } from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  BooleanField,
  Show,
  SimpleShowLayout,
  useRecordContext,
  useNotify,
  useRefresh,
  TopToolbar,
  Button,
  FunctionField,
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
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

import { adminActions } from '../dataProvider';

const PlayerStatusChip = () => {
  const record = useRecordContext();
  if (!record) return null;

  if (record.moderation?.isBanned) {
    return <Chip label="BANNED" color="error" size="small" />;
  }
  if (record.moderation?.isMuted) {
    return <Chip label="MUTED" color="warning" size="small" />;
  }
  return <Chip label="ACTIVE" color="success" size="small" />;
};

const WalletField = () => {
  const record = useRecordContext();
  if (!record?.walletAddress) return null;
  const addr = record.walletAddress;
  return <span>{`${addr.slice(0, 6)}...${addr.slice(-4)}`}</span>;
};

const PlayerActions = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [warnDialogOpen, setWarnDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState(7);
  const [warnReason, setWarnReason] = useState('');

  if (!record) return null;

  const handleBan = async () => {
    try {
      await adminActions.banPlayer(record.id, {
        reason: banReason,
        duration: banDuration,
      });
      notify('Player banned successfully', { type: 'success' });
      setBanDialogOpen(false);
      refresh();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  const handleUnban = async () => {
    try {
      await adminActions.unbanPlayer(record.id, 'Manual unban');
      notify('Player unbanned successfully', { type: 'success' });
      refresh();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  const handleWarn = async () => {
    try {
      await adminActions.warnPlayer(record.id, { reason: warnReason });
      notify('Warning issued successfully', { type: 'success' });
      setWarnDialogOpen(false);
      refresh();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  return (
    <Box>
      {!record.moderation?.isBanned ? (
        <Button
          label="Ban"
          onClick={() => setBanDialogOpen(true)}
          startIcon={<BlockIcon />}
          color="error"
        />
      ) : (
        <Button
          label="Unban"
          onClick={handleUnban}
          startIcon={<CheckCircleIcon />}
          color="success"
        />
      )}
      <Button
        label="Warn"
        onClick={() => setWarnDialogOpen(true)}
        startIcon={<WarningIcon />}
        color="warning"
      />

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onClose={() => setBanDialogOpen(false)}>
        <DialogTitle>Ban Player: {record.username}</DialogTitle>
        <DialogContent>
          <MuiTextField
            label="Reason"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            fullWidth
            multiline
            rows={3}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Duration (days)</InputLabel>
            <Select
              value={banDuration}
              onChange={(e) => setBanDuration(e.target.value)}
              label="Duration (days)"
            >
              <MenuItem value={1}>1 day</MenuItem>
              <MenuItem value={3}>3 days</MenuItem>
              <MenuItem value={7}>7 days</MenuItem>
              <MenuItem value={14}>14 days</MenuItem>
              <MenuItem value={30}>30 days</MenuItem>
              <MenuItem value={-1}>Permanent</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setBanDialogOpen(false)}>Cancel</MuiButton>
          <MuiButton onClick={handleBan} color="error" variant="contained">
            Ban Player
          </MuiButton>
        </DialogActions>
      </Dialog>

      {/* Warn Dialog */}
      <Dialog open={warnDialogOpen} onClose={() => setWarnDialogOpen(false)}>
        <DialogTitle>Warn Player: {record.username}</DialogTitle>
        <DialogContent>
          <MuiTextField
            label="Warning Reason"
            value={warnReason}
            onChange={(e) => setWarnReason(e.target.value)}
            fullWidth
            multiline
            rows={3}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setWarnDialogOpen(false)}>Cancel</MuiButton>
          <MuiButton onClick={handleWarn} color="warning" variant="contained">
            Issue Warning
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export const PlayerList = () => (
  <List
    sort={{ field: 'createdAt', order: 'DESC' }}
    filters={[]}
  >
    <Datagrid rowClick="show">
      <TextField source="username" />
      <WalletField source="walletAddress" label="Wallet" />
      <TextField source="tribe.name" label="Tribe" />
      <NumberField source="gold" />
      <PlayerStatusChip source="status" label="Status" />
      <NumberField source="moderation.warningCount" label="Warnings" />
      <DateField source="createdAt" label="Joined" />
      <PlayerActions />
    </Datagrid>
  </List>
);

export const PlayerShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="username" />
      <TextField source="walletAddress" />
      <TextField source="tribe.name" label="Tribe" />
      <NumberField source="gold" />
      <NumberField source="army.militia" label="Militia" />
      <NumberField source="army.spearman" label="Spearmen" />
      <NumberField source="army.archer" label="Archers" />
      <NumberField source="army.cavalry" label="Cavalry" />
      <BooleanField source="moderation.isBanned" label="Banned" />
      <BooleanField source="moderation.isMuted" label="Muted" />
      <NumberField source="moderation.warningCount" label="Warnings" />
      <TextField source="moderation.banReason" label="Ban Reason" />
      <DateField source="moderation.banUntil" label="Ban Until" />
      <DateField source="lastLogin" label="Last Login" />
      <DateField source="createdAt" label="Joined" />
    </SimpleShowLayout>
  </Show>
);
