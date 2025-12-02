import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  BooleanField,
  Show,
  SimpleShowLayout,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  SelectInput,
  BooleanInput,
  PasswordInput,
  useRecordContext,
} from 'react-admin';
import { Chip, Box } from '@mui/material';

const RoleChip = () => {
  const record = useRecordContext();
  if (!record) return null;

  const colors = {
    super_admin: 'error',
    game_master: 'warning',
    moderator: 'info',
  };

  const labels = {
    super_admin: 'Super Admin',
    game_master: 'Game Master',
    moderator: 'Moderator',
  };

  return (
    <Chip
      label={labels[record.role] || record.role}
      color={colors[record.role] || 'default'}
      size="small"
    />
  );
};

const StatusChip = () => {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Chip
      label={record.isActive ? 'ACTIVE' : 'INACTIVE'}
      color={record.isActive ? 'success' : 'default'}
      size="small"
    />
  );
};

const WalletField = () => {
  const record = useRecordContext();
  if (!record?.walletAddress) return <span>-</span>;
  const addr = record.walletAddress;
  return <span>{`${addr.slice(0, 6)}...${addr.slice(-4)}`}</span>;
};

export const AdminList = () => (
  <List sort={{ field: 'createdAt', order: 'DESC' }}>
    <Datagrid rowClick="edit">
      <TextField source="username" />
      <TextField source="email" />
      <WalletField source="walletAddress" label="Wallet" />
      <RoleChip source="role" label="Role" />
      <StatusChip source="isActive" label="Status" />
      <DateField source="lastLogin" label="Last Login" />
      <DateField source="createdAt" label="Created" />
    </Datagrid>
  </List>
);

export const AdminCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="username" required fullWidth />
      <SelectInput
        source="role"
        choices={[
          { id: 'super_admin', name: 'Super Admin' },
          { id: 'game_master', name: 'Game Master' },
          { id: 'moderator', name: 'Moderator' },
        ]}
        required
      />
      <TextInput source="email" type="email" fullWidth helperText="Required for Super Admin" />
      <PasswordInput source="password" fullWidth helperText="Required for Super Admin" />
      <TextInput source="walletAddress" fullWidth helperText="Required for Game Master/Moderator" />
    </SimpleForm>
  </Create>
);

export const AdminEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="username" disabled />
      <SelectInput
        source="role"
        choices={[
          { id: 'super_admin', name: 'Super Admin' },
          { id: 'game_master', name: 'Game Master' },
          { id: 'moderator', name: 'Moderator' },
        ]}
      />
      <BooleanInput source="isActive" label="Active" />
      <TextInput source="ipWhitelist" fullWidth helperText="Comma-separated IP addresses" />
    </SimpleForm>
  </Edit>
);
