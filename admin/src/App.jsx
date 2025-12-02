import React from 'react';
import { Admin, Resource, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';

import dataProvider from './dataProvider';
import authProvider from './authProvider';
import theme from './theme';

// Pages
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';

// Resources
import { SeasonList, SeasonEdit, SeasonCreate, SeasonShow } from './resources/seasons';
import { PlayerList, PlayerShow } from './resources/players';
import { TribeList, TribeShow } from './resources/tribes';
import { BattleList, BattleShow } from './resources/battles';
import { ReportList, ReportShow } from './resources/reports';
import { AppealList, AppealShow } from './resources/appeals';
import { AuditLogList, AuditLogShow } from './resources/auditLogs';
import { AdminList, AdminCreate, AdminEdit } from './resources/admins';

// Icons
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import ReportIcon from '@mui/icons-material/Report';
import GavelIcon from '@mui/icons-material/Gavel';
import HistoryIcon from '@mui/icons-material/History';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

// Custom Layout
import { Layout } from './components/Layout';

const App = () => {
  return (
    <Admin
      dataProvider={dataProvider}
      authProvider={authProvider}
      dashboard={Dashboard}
      loginPage={LoginPage}
      theme={theme}
      layout={Layout}
      title="CryptoTribes Admin"
      requireAuth
    >
      {(permissions) => (
        <>
          {/* Seasons - Full CRUD for super_admin/game_master */}
          <Resource
            name="seasons"
            list={SeasonList}
            show={SeasonShow}
            edit={permissions?.role === 'super_admin' || permissions?.role === 'game_master' ? SeasonEdit : undefined}
            create={permissions?.role === 'super_admin' || permissions?.role === 'game_master' ? SeasonCreate : undefined}
            icon={CalendarMonthIcon}
            options={{ label: 'Seasons' }}
          />

          {/* Players - View for all, actions based on role */}
          <Resource
            name="players"
            list={PlayerList}
            show={PlayerShow}
            icon={PeopleIcon}
            options={{ label: 'Players' }}
          />

          {/* Tribes - View for all */}
          <Resource
            name="tribes"
            list={TribeList}
            show={TribeShow}
            icon={GroupsIcon}
            options={{ label: 'Tribes' }}
          />

          {/* Battles - View for all, rollback for game_master+ */}
          <Resource
            name="battles"
            list={BattleList}
            show={BattleShow}
            icon={SportsMmaIcon}
            options={{ label: 'Battles' }}
          />

          {/* Reports - Available for moderators+ */}
          <Resource
            name="moderation/reports"
            list={ReportList}
            show={ReportShow}
            icon={ReportIcon}
            options={{ label: 'Reports' }}
          />

          {/* Appeals - Available for game_master+ */}
          {(permissions?.role === 'super_admin' || permissions?.role === 'game_master') && (
            <Resource
              name="moderation/appeals"
              list={AppealList}
              show={AppealShow}
              icon={GavelIcon}
              options={{ label: 'Appeals' }}
            />
          )}

          {/* Audit Logs - All admins can see (filtered by role) */}
          <Resource
            name="audit-logs"
            list={AuditLogList}
            show={AuditLogShow}
            icon={HistoryIcon}
            options={{ label: 'Audit Logs' }}
          />

          {/* Admin Management - Super Admin only */}
          {permissions?.role === 'super_admin' && (
            <Resource
              name="config/admins"
              list={AdminList}
              create={AdminCreate}
              edit={AdminEdit}
              icon={AdminPanelSettingsIcon}
              options={{ label: 'Admin Users' }}
            />
          )}
        </>
      )}
    </Admin>
  );
};

export default App;
