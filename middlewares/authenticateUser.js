const jwt = require('jsonwebtoken');

const authenticateUser = (req, res, next) => {
  // Get the token from the request headers
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided, authorization denied' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add the user information to the request object
    req.user = decoded.user;

    // Move to the next middleware or route handler
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

module.exports = authenticateUser;