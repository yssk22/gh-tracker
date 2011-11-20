var fn = function(n){
  return n < 10 ? "0" + n : n;
}


module.exports = {
  formatDate: function(d){
    return d.getFullYear() + '-' + fn(d.getMonth() + 1) + '-' + fn(d.getDate());
  },
  formatTime: function(d){
    return d.getFullYear() + '-' + fn(d.getMonth() + 1) + '-' + fn(d.getDate()) + ' ' +
      fn(d.getHours()) + ':' + fn(d.getMinutes());
  }
}