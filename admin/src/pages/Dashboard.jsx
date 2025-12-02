import React, { useState, useEffect } from 'react';
import { Title, usePermissions } from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

import { adminActions } from '../dataProvider';

const StatCard = ({ title, value, icon: Icon, color = 'primary' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" variant="body2" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div" color={`${color}.main`}>
            {value?.toLocaleString() ?? '-'}
          </Typography>
        </Box>
        <Icon sx={{ fontSize: 48, color: `${color}.main`, opacity: 0.3 }} />
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { permissions } = usePermissions();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState('');

  useEffect(() => {
    loadDashboard();
  }, [selectedSeason]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await adminActions.getDashboard(selectedSeason || undefined);
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (dashboardData?.noActiveSeason) {
    return (
      <Box p={3}>
        <Title title="Dashboard" />
        <Alert severity="info">
          No active season found. Create a new season to get started.
        </Alert>
      </Box>
    );
  }

  const { season, stats, topTribes, recentBattles, alerts } = dashboardData || {};

  return (
    <Box p={3}>
      <Title title="CryptoTribes Admin Dashboard" />

      {/* Season Info Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #16213e 0%, #1a1a2e 100%)' }}>
        <CardContent>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" color="primary" gutterBottom>
                {season?.name || 'Current Season'}
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Chip
                  label={season?.status?.toUpperCase() || 'UNKNOWN'}
                  color={season?.status === 'active' ? 'success' : 'default'}
                  size="small"
                />
                <Typography variant="body2" color="textSecondary">
                  Day {season?.dayNumber || 0} of {season?.totalDays || 30}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box textAlign={{ md: 'right' }}>
                <Typography variant="body2" color="textSecondary">Prize Pool</Typography>
                <Typography variant="h6" color="secondary">
                  {season?.prizePool?.toLocaleString() || 0} GOLD
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts?.length > 0 && (
        <Box mb={3}>
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              severity={alert.type}
              icon={alert.type === 'warning' ? <WarningIcon /> : <InfoIcon />}
              sx={{ mb: 1 }}
            >
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Players"
            value={stats?.playerCount}
            icon={PeopleIcon}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Tribes"
            value={stats?.tribeCount}
            icon={GroupsIcon}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Battles Today"
            value={stats?.battleCountToday}
            icon={SportsMmaIcon}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Battles"
            value={stats?.battleCountTotal}
            icon={TrendingUpIcon}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Top Tribes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <EmojiEventsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Top Tribes
              </Typography>
              <List>
                {topTribes?.map((tribe, index) => (
                  <ListItem key={tribe.id || index} divider>
                    <ListItemIcon>
                      <Chip
                        label={`#${index + 1}`}
                        size="small"
                        color={index === 0 ? 'primary' : 'default'}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1">{tribe.name}</Typography>
                          <Chip label={tribe.tag} size="small" variant="outlined" />
                        </Box>
                      }
                      secondary={`${tribe.victoryPoints?.toLocaleString() || 0} VP • ${tribe.memberCount || 0} members`}
                    />
                  </ListItem>
                ))}
                {(!topTribes || topTribes.length === 0) && (
                  <ListItem>
                    <ListItemText primary="No tribes yet" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Battles */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SportsMmaIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recent Battles
              </Typography>
              <List>
                {recentBattles?.map((battle, index) => (
                  <ListItem key={battle.id || index} divider>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2">
                            {battle.attackerId?.username || 'Unknown'}
                          </Typography>
                          <Chip
                            label={battle.result === 'attacker_won' ? 'WON' : 'LOST'}
                            size="small"
                            color={battle.result === 'attacker_won' ? 'success' : 'error'}
                          />
                          <Typography variant="body2">
                            vs {battle.defenderId?.username || 'Unknown'}
                          </Typography>
                        </Box>
                      }
                      secondary={new Date(battle.timestamp).toLocaleString()}
                    />
                  </ListItem>
                ))}
                {(!recentBattles || recentBattles.length === 0) && (
                  <ListItem>
                    <ListItemText primary="No battles yet" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Admin Info */}
      <Box mt={3}>
        <Typography variant="body2" color="textSecondary">
          Logged in as: {permissions?.role?.replace('_', ' ').toUpperCase()}
        </Typography>
      </Box>
    </Box>
  );
};

export default Dashboard;
