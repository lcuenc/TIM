// src/components/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import { isAuthenticated, getCachedUser } from "../utils/auth";
import { useState, useEffect } from "react";

export default function PrivateRoute({ children, roles }) {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const check = () => {
      if (!isAuthenticated()) {
        setAuthorized(false);
      } else if (roles && roles.length > 0) {
        const user = getCachedUser();
        setAuthorized(user && roles.includes(user.rol));
      } else {
        setAuthorized(true);
      }
      setChecking(false);
    };
    check();
  }, [roles]);

  if (checking) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: "1.2rem"
      }}>
        🔄 Verificando sesión...
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
