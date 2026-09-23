import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { OrgPublicProfile } from "../components/OrgPublicProfile";

export const OrgProfile: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  if (!orgId) {
    return null;
  }

  return (
    <OrgPublicProfile 
      orgUserId={orgId} 
      showBackButton={true} 
      onBack={() => navigate('/explore')} 
    />
  );
};

export default OrgProfile;
