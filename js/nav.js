function updateCartBadge() {
  var badge = document.getElementById('cart-badge');
  if (!badge) return;
  var count = Cart.getTotalCount();
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  updateCartBadge();
  document.addEventListener('cartUpdated', updateCartBadge);

  var cartBtn = document.getElementById('nav-cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', function() {
      location.href = 'cart.html';
    });
  }

  var list = document.getElementById('nav-dept-links');
  if (!list) return;

  var params   = new URLSearchParams(location.search);
  var activeDept = params.get('dept');

  Api.getDepartments().then(function(res) {
    var depts = res.data;

    depts.forEach(function(d) {
      var li = document.createElement('li');
      var a  = document.createElement('a');
      a.href        = 'index.html?dept=' + d.department_id;
      a.textContent = d.department_name;
      if (String(d.department_id) === activeDept) {
        a.classList.add('active');
      }
      li.appendChild(a);
      list.appendChild(li);
    });

    appendSaleLink(list);

    if (activeDept) {
      document.dispatchEvent(new CustomEvent('deptSelected', {
        detail: { deptId: activeDept }
      }));
    }
  }).catch(function(err) {
    console.error('Nav: failed to load departments', err);
    appendSaleLink(list);
  });

  function appendSaleLink(list) {
    var li = document.createElement('li');
    var a  = document.createElement('a');
    a.href        = '#';
    a.textContent = 'Sale';
    a.className   = 'sale';
    li.appendChild(a);
    list.appendChild(li);
  }
});
