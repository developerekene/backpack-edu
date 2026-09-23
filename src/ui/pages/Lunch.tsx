import { Navigate } from "react-router-dom";
import { LunchGames } from "../components/LunchGames";
import { useAuth } from "../../store/AuthContext";

const Lunch = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 animate-in fade-in slide-in-from-bottom-4">
      <LunchGames />
    </div>
  );
};

export default Lunch;
