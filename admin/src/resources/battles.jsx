import React, { useState } from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  Show,
  SimpleShowLayout,
  useRecordContext,
  useNotify,
  useRefresh,
  Button,
  usePermissions,
} from 'react-admin';
import {
  Chip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
  Button as MuiButton,
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';

import { adminActions } from '../dataProvider';

const BattleResultChip = () => {
  const record = useRecordContext();
  if (!record) return null;

  const colors = {
    attacker_won: 'success',
    defender_won: 'error',
    draw: 'warning',
    cancelled: 'default',
  };

  const labels = {
    attacker_won: 'Attacker Won',
    defender_won: 'Defender Won',
    draw: 'Draw',
    cancelled: 'Cancelled',
  };

  return (
    <Chip
      label={labels[record.result] || record.result}
      color={colors[record.result] || 'default'}
      size="small"
    />
  );
};

const RollbackButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const { permissions } = usePermissions();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (!record) return null;

  // Only super_admin and game_master can rollback
  if (!['super_admin', 'game_master'].includes(permissions?.role)) {
    return null;
  }

  // Can't rollback already rolled back battles
  if (record.isRolledBack) {
    return <Chip label="Rolled Back" size="small" variant="outlined" />;
  }

  const handleRollback = async () => {
    try {
      await adminActions.rollbackBattle(record.id, reason);
      notify('Battle rolled back successfully', { type: 'success' });
      setOpen(false);
      refresh();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  return (
    <>
      <Button
        label="Rollback"
        onClick={() => setOpen(true)}
        startIcon={<UndoIcon />}
        color="warning"
      />
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Rollback Battle</DialogTitle>
        <DialogContent>
          <MuiTextField
            label="Reason for rollback"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            rows={3}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setOpen(false)}>Cancel</MuiButton>
          <MuiButton
            onClick={handleRollback}
            color="warning"
            variant="contained"
            disabled={!reason}
          >
            Confirm Rollback
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export const BattleList = () => (
  <List sort={{ field: 'timestamp', order: 'DESC' }}>
    <Datagrid rowClick="show">
      <TextField source="attackerId.username" label="Attacker" />
      <TextField source="defenderId.username" label="Defender" />
      <BattleResultChip source="result" label="Result" />
      <NumberField source="casualties.attacker" label="Attacker Losses" />
      <NumberField source="casualties.defender" label="Defender Losses" />
      <NumberField source="goldStolen" label="Gold Stolen" />
      <DateField source="timestamp" label="Time" showTime />
      <RollbackButton />
    </Datagrid>
  </List>
);

export const BattleShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="attackerId.username" label="Attacker" />
      <TextField source="attackerId.walletAddress" label="Attacker Wallet" />
      <TextField source="defenderId.username" label="Defender" />
      <TextField source="defenderId.walletAddress" label="Defender Wallet" />
      <BattleResultChip source="result" />
      <NumberField source="casualties.attacker" label="Attacker Losses" />
      <NumberField source="casualties.defender" label="Defender Losses" />
      <NumberField source="goldStolen" label="Gold Stolen" />
      <NumberField source="vpChange.attacker" label="Attacker VP Change" />
      <NumberField source="vpChange.defender" label="Defender VP Change" />
      <TextField source="territory.name" label="Territory" />
      <DateField source="timestamp" label="Time" showTime />
    </SimpleShowLayout>
  </Show>
);
