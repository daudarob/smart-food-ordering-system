const authorize = (roles = []) => {
  return (req, res, next) => {
    console.log('Authorize middleware: req.user:', req.user ? req.user.role : 'no user');
    console.log('Roles:', roles);
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      console.log('Denying access for role:', req.user.role);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = { authorize };