const API_BASE = 'https://storeapi-60py.onrender.com';

async function apiFetch(path) {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + path);
  return res.json();
}

window.Api = {
  getDepartments: function() {
    return apiFetch('/departments');
  },

  getCategories: function(deptId) {
    return apiFetch('/categories?department_id=' + deptId);
  },

  getAllCategories: async function() {
    const deptsRes = await apiFetch('/departments');
    const depts = deptsRes.data;
    const results = await Promise.all(
      depts.map(function(d) { return apiFetch('/categories?department_id=' + d.department_id); })
    );
    return {
      departments: depts,
      categories: results.flatMap(function(r) { return r.data; })
    };
  },

  getProducts: function(categoryId, limit, offset) {
    limit  = limit  !== undefined ? limit  : 8;
    offset = offset !== undefined ? offset : 0;
    return apiFetch('/products?category_id=' + categoryId + '&limit=' + limit + '&offset=' + offset);
  },

  getProduct: function(id) {
    return apiFetch('/products/' + id);
  },

  getAllProducts: function(limit) {
    return apiFetch('/products?limit=' + (limit !== undefined ? limit : 200));
  },

  getProductImages: function(id) {
    return apiFetch('/products/' + id + '/images');
  }
};
