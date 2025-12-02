import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Show,
  SimpleShowLayout,
  useRecordContext,
} from 'react-admin';
import { Chip, Box, Typography } from '@mui/material';

const ActionChip = () => {
  const record = useRecordContext();
  if (!record) return null;

  const getColor = (action) => {
    if (action?.includes('CREATE') || action?.includes('START')) return 'success';
    if (action?.includes('DELETE') || action?.includes('BAN') || action?.includes('END')) return 'error';
    if (action?.includes('UPDATE') || action?.includes('MODIFY')) return 'warning';
    if (action?.includes('LOGIN') || action?.includes('VIEW')) return 'info';
    return 'default';
  };

  return (
    <Chip
      label={record.action}
      color={getColor(record.action)}
      size="small"
    />
  );
};

const TargetField = () => {
  const record = useRecordContext();
  if (!record?.target) return <span>-</span>;

  return (
    <Box>
      <Typography variant="body2">
        {record.target.type}: {record.target.name || record.target.id}
      </Typography>
    </Box>
  );
};

const ResultChip = () => {
  const record = useRecordContext();
  if (!record?.result) return null;

  return (
    <Chip
      label={record.result}
      color={record.result === 'success' ? 'success' : 'error'}
      size="small"
      variant="outlined"
    />
  );
};

export const AuditLogList = () => (
  <List
    sort={{ field: 'timestamp', order: 'DESC' }}
    perPage={50}
  >
    <Datagrid rowClick="show">
      <DateField source="timestamp" label="Time" showTime />
      <TextField source="adminId.username" label="Admin" />
      <TextField source="adminRole" label="Role" />
      <ActionChip source="action" label="Action" />
      <TargetField label="Target" />
      <ResultChip source="result" label="Result" />
      <TextField source="ipAddress" label="IP" />
    </Datagrid>
  </List>
);

export const AuditLogShow = () => (
  <Show>
    <SimpleShowLayout>
      <DateField source="timestamp" showTime />
      <TextField source="adminId.username" label="Admin" />
      <TextField source="adminId.email" label="Admin Email" />
      <TextField source="adminRole" label="Role" />
      <ActionChip source="action" />
      <TextField source="target.type" label="Target Type" />
      <TextField source="target.id" label="Target ID" />
      <TextField source="target.name" label="Target Name" />
      <TextField source="result" label="Result" />
      <TextField source="ipAddress" label="IP Address" />
      <TextField source="userAgent" label="User Agent" />
      <TextField source="details" label="Details" />
    </SimpleShowLayout>
  </Show>
);
