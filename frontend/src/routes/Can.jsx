import { useAuth } from "../context/AuthContext";

export default function Can({ permission, children }) {
  const { can } = useAuth();
  return can(permission) ? children : null;
}
