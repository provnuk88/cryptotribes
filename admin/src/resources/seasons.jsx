import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  ChipField,
  Show,
  SimpleShowLayout,
  Edit,
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  DateTimeInput,
  SelectInput,
  useRecordContext,
  TopToolbar,
  Button,
  useNotify,
  useRefresh,
} from 'react-admin';
import { Chip, Box } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';

import { adminActions } from '../dataProvider';

const SeasonStatusField = () => {
  const record = useRecordContext();
  if (!record) return null;

  const colors = {
    draft: 'default',
    registration: 'info',
    active: 'success',
    ending: 'warning',
    ended: 'error',
    archived: 'default',
  };

  return (
    <Chip
      label={record.status?.toUpperCase()}
      color={colors[record.status] || 'default'}
      size="small"
    />
  );
};

const SeasonActions = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();

  if (!record) return null;

  const handleStart = async () => {
    try {
      await adminActions.startSeason(record.id);
      notify('Season started successfully', { type: 'success' });
      refresh();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  const handleEnd = async () => {
    try {
      await adminActions.endSeason(record.id);
      notify('Season ended successfully', { type: 'success' });
      refresh();
    } catch (err) {
      notify(err.message, { type: 'error' });
    }
  };

  return (
    <Box>
      {(record.status === 'draft' || record.status === 'registration') && (
        <Button
          label="Start Season"
          onClick={handleStart}
          startIcon={<PlayArrowIcon />}
          color="success"
        />
      )}
      {record.status === 'active' && (
        <Button
          label="End Season"
          onClick={handleEnd}
          startIcon={<StopIcon />}
          color="error"
        />
      )}
    </Box>
  );
};

export const SeasonList = () => (
  <List sort={{ field: 'createdAt', order: 'DESC' }}>
    <Datagrid rowClick="show">
      <TextField source="name" label="Name" />
      <NumberField source="seasonNumber" label="Season #" />
      <SeasonStatusField source="status" label="Status" />
      <NumberField source="prizePool" label="Prize Pool" />
      <DateField source="timeline.seasonStart" label="Start Date" />
      <DateField source="timeline.seasonEnd" label="End Date" />
      <SeasonActions />
    </Datagrid>
  </List>
);

export const SeasonShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="name" />
      <NumberField source="seasonNumber" />
      <SeasonStatusField source="status" />
      <NumberField source="prizePool" />
      <DateField source="timeline.registrationStart" label="Registration Start" />
      <DateField source="timeline.registrationEnd" label="Registration End" />
      <DateField source="timeline.seasonStart" label="Season Start" />
      <DateField source="timeline.seasonEnd" label="Season End" />
      <NumberField source="config.maxPlayersPerTribe" label="Max Players/Tribe" />
      <NumberField source="config.maxTribes" label="Max Tribes" />
      <NumberField source="config.startingGold" label="Starting Gold" />
      <DateField source="createdAt" label="Created At" />
    </SimpleShowLayout>
  </Show>
);

export const SeasonEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name" fullWidth />
      <SelectInput
        source="status"
        choices={[
          { id: 'draft', name: 'Draft' },
          { id: 'registration', name: 'Registration' },
          { id: 'active', name: 'Active' },
          { id: 'ending', name: 'Ending' },
          { id: 'ended', name: 'Ended' },
          { id: 'archived', name: 'Archived' },
        ]}
      />
      <NumberInput source="prizePool" />
      <DateTimeInput source="timeline.registrationStart" label="Registration Start" />
      <DateTimeInput source="timeline.registrationEnd" label="Registration End" />
      <DateTimeInput source="timeline.seasonStart" label="Season Start" />
      <DateTimeInput source="timeline.seasonEnd" label="Season End" />
      <NumberInput source="config.maxPlayersPerTribe" label="Max Players/Tribe" />
      <NumberInput source="config.maxTribes" label="Max Tribes" />
      <NumberInput source="config.startingGold" label="Starting Gold" />
    </SimpleForm>
  </Edit>
);

export const SeasonCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name" fullWidth required />
      <NumberInput source="seasonNumber" required />
      <NumberInput source="prizePool" defaultValue={0} />
      <DateTimeInput source="timeline.registrationStart" label="Registration Start" />
      <DateTimeInput source="timeline.registrationEnd" label="Registration End" />
      <DateTimeInput source="timeline.seasonStart" label="Season Start" />
      <DateTimeInput source="timeline.seasonEnd" label="Season End" />
      <NumberInput source="config.maxPlayersPerTribe" label="Max Players/Tribe" defaultValue={50} />
      <NumberInput source="config.maxTribes" label="Max Tribes" defaultValue={10} />
      <NumberInput source="config.startingGold" label="Starting Gold" defaultValue={1000} />
    </SimpleForm>
  </Create>
);
