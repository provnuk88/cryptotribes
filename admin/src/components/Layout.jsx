import React from 'react';
import { Layout as RaLayout, Menu, usePermissions } from 'react-admin';
import { Box, Typography, Divider } from '@mui/material';

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import ReportIcon from '@mui/icons-material/Report';
import GavelIcon from '@mui/icons-material/Gavel';
import HistoryIcon from '@mui/icons-material/History';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DashboardIcon from '@mui/icons-material/Dashboard';

const CustomMenu = () => {
  const { permissions } = usePermissions();
  const role = permissions?.role;

  return (
    <Menu>
      <Menu.DashboardItem primaryText="Dashboard" leftIcon={<DashboardIcon />} />

      <Box px={2} py={1}>
        <Typography variant="caption" color="textSecondary">
          GAME MANAGEMENT
        </Typography>
      </Box>

      <Menu.ResourceItem name="seasons" primaryText="Seasons" leftIcon={<CalendarMonthIcon />} />
      <Menu.ResourceItem name="players" primaryText="Players" leftIcon={<PeopleIcon />} />
      <Menu.ResourceItem name="tribes" primaryText="Tribes" leftIcon={<GroupsIcon />} />
      <Menu.ResourceItem name="battles" primaryText="Battles" leftIcon={<SportsMmaIcon />} />

      <Divider sx={{ my: 1 }} />

      <Box px={2} py={1}>
        <Typography variant="caption" color="textSecondary">
          MODERATION
        </Typography>
      </Box>

      <Menu.ResourceItem name="moderation/reports" primaryText="Reports" leftIcon={<ReportIcon />} />

      {(role === 'super_admin' || role === 'game_master') && (
        <Menu.ResourceItem name="moderation/appeals" primaryText="Appeals" leftIcon={<GavelIcon />} />
      )}

      <Divider sx={{ my: 1 }} />

      <Box px={2} py={1}>
        <Typography variant="caption" color="textSecondary">
          SYSTEM
        </Typography>
      </Box>

      <Menu.ResourceItem name="audit-logs" primaryText="Audit Logs" leftIcon={<HistoryIcon />} />

      {role === 'super_admin' && (
        <Menu.ResourceItem name="config/admins" primaryText="Admin Users" leftIcon={<AdminPanelSettingsIcon />} />
      )}
    </Menu>
  );
};

export const Layout = (props) => (
  <RaLayout {...props} menu={CustomMenu} />
);

export default Layout;
