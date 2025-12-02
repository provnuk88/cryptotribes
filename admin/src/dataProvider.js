/**
 * React-Admin Data Provider for CryptoTribes Admin Panel
 * Custom implementation to handle our API format
 */

const API_URL = '/api/admin';

const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

const dataProvider = {
  // Get list of resources
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination || { page: 1, perPage: 25 };
    const { field, order } = params.sort || { field: 'id', order: 'DESC' };
    const filter = params.filter || {};

    const query = new URLSearchParams({
      page: page.toString(),
      limit: perPage.toString(),
      sortBy: field,
      sortOrder: order.toLowerCase(),
      ...Object.fromEntries(
        Object.entries(filter).filter(([_, v]) => v !== '' && v !== undefined)
      ),
    });

    const response = await fetch(`${API_URL}/${resource}?${query}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch list');
    }

    const { data, meta } = await response.json();

    return {
      data: data.map(item => ({ ...item, id: item.id || item._id })),
      total: meta?.total || data.length,
    };
  },

  // Get single resource
  getOne: async (resource, params) => {
    const response = await fetch(`${API_URL}/${resource}/${params.id}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch resource');
    }

    const { data } = await response.json();
    return { data: { ...data, id: data.id || data._id } };
  },

  // Get multiple resources by IDs
  getMany: async (resource, params) => {
    const responses = await Promise.all(
      params.ids.map(id =>
        fetch(`${API_URL}/${resource}/${id}`, {
          headers: getAuthHeaders(),
        }).then(r => r.json())
      )
    );

    return {
      data: responses.map(({ data }) => ({ ...data, id: data.id || data._id })),
    };
  },

  // Get resources referenced by another resource
  getManyReference: async (resource, params) => {
    const { page, perPage } = params.pagination || { page: 1, perPage: 25 };
    const { field, order } = params.sort || { field: 'id', order: 'DESC' };

    const query = new URLSearchParams({
      page: page.toString(),
      limit: perPage.toString(),
      sortBy: field,
      sortOrder: order.toLowerCase(),
      [params.target]: params.id,
    });

    const response = await fetch(`${API_URL}/${resource}?${query}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch references');
    }

    const { data, meta } = await response.json();

    return {
      data: data.map(item => ({ ...item, id: item.id || item._id })),
      total: meta?.total || data.length,
    };
  },

  // Create new resource
  create: async (resource, params) => {
    const response = await fetch(`${API_URL}/${resource}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params.data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create resource');
    }

    const { data } = await response.json();
    return { data: { ...data, id: data.id || data._id } };
  },

  // Update existing resource
  update: async (resource, params) => {
    const response = await fetch(`${API_URL}/${resource}/${params.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(params.data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update resource');
    }

    const { data } = await response.json();
    return { data: { ...data, id: data.id || data._id } };
  },

  // Update multiple resources
  updateMany: async (resource, params) => {
    const responses = await Promise.all(
      params.ids.map(id =>
        fetch(`${API_URL}/${resource}/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(params.data),
        })
      )
    );

    return { data: params.ids };
  },

  // Delete single resource
  delete: async (resource, params) => {
    const response = await fetch(`${API_URL}/${resource}/${params.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete resource');
    }

    return { data: { id: params.id } };
  },

  // Delete multiple resources
  deleteMany: async (resource, params) => {
    await Promise.all(
      params.ids.map(id =>
        fetch(`${API_URL}/${resource}/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })
      )
    );

    return { data: params.ids };
  },
};

// Custom methods for specific admin actions
export const adminActions = {
  // Dashboard data
  getDashboard: async (seasonId) => {
    const query = seasonId ? `?seasonId=${seasonId}` : '';
    const response = await fetch(`${API_URL}/analytics/dashboard${query}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch dashboard');
    const { data } = await response.json();
    return data;
  },

  // Player actions
  banPlayer: async (playerId, data) => {
    const response = await fetch(`${API_URL}/players/${playerId}/ban`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to ban player');
    return response.json();
  },

  unbanPlayer: async (playerId, reason) => {
    const response = await fetch(`${API_URL}/players/${playerId}/unban`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error('Failed to unban player');
    return response.json();
  },

  warnPlayer: async (playerId, data) => {
    const response = await fetch(`${API_URL}/players/${playerId}/warn`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to warn player');
    return response.json();
  },

  // Season actions
  startSeason: async (seasonId) => {
    const response = await fetch(`${API_URL}/seasons/${seasonId}/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to start season');
    return response.json();
  },

  endSeason: async (seasonId) => {
    const response = await fetch(`${API_URL}/seasons/${seasonId}/end`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to end season');
    return response.json();
  },

  // Battle actions
  rollbackBattle: async (battleId, reason) => {
    const response = await fetch(`${API_URL}/battles/${battleId}/rollback`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error('Failed to rollback battle');
    return response.json();
  },

  // Report actions
  assignReport: async (reportId) => {
    const response = await fetch(`${API_URL}/moderation/reports/${reportId}/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to assign report');
    return response.json();
  },

  resolveReport: async (reportId, resolution) => {
    const response = await fetch(`${API_URL}/moderation/reports/${reportId}/resolve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ resolution }),
    });
    if (!response.ok) throw new Error('Failed to resolve report');
    return response.json();
  },

  // Appeal actions
  reviewAppeal: async (appealId, decision, reviewNotes) => {
    const response = await fetch(`${API_URL}/moderation/appeals/${appealId}/review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ decision, reviewNotes }),
    });
    if (!response.ok) throw new Error('Failed to review appeal');
    return response.json();
  },
};

export default dataProvider;
