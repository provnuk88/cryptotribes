import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  Show,
  SimpleShowLayout,
  useRecordContext,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

const TribeColorChip = () => {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Box
        sx={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: record.color || '#888',
        }}
      />
      <span>{record.tag}</span>
    </Box>
  );
};

export const TribeList = () => (
  <List sort={{ field: 'victoryPoints', order: 'DESC' }}>
    <Datagrid rowClick="show">
      <TextField source="name" />
      <TribeColorChip source="tag" label="Tag" />
      <NumberField source="victoryPoints" label="Victory Points" />
      <NumberField source="memberCount" label="Members" />
      <NumberField source="territoriesControlled" label="Territories" />
      <TextField source="leader.username" label="Leader" />
      <DateField source="createdAt" label="Founded" />
    </Datagrid>
  </List>
);

export const TribeShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="name" />
      <TextField source="tag" />
      <TextField source="description" />
      <NumberField source="victoryPoints" label="Victory Points" />
      <NumberField source="memberCount" label="Members" />
      <NumberField source="territoriesControlled" label="Territories" />
      <TextField source="leader.username" label="Leader" />
      <TextField source="leader.walletAddress" label="Leader Wallet" />
      <NumberField source="treasury.gold" label="Treasury Gold" />
      <DateField source="createdAt" label="Founded" />
    </SimpleShowLayout>
  </Show>
);
