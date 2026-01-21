import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBOMStore } from '@/stores/bom-store';

/**
 * Legacy route handler for backward compatibility.
 * Treats the projectId param as a packageId, sets scope, then redirects to /bom.
 * The modal will still open on /bom per phase requirements.
 */
export function BomProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { setScope } = useBOMStore();

  useEffect(() => {
    if (projectId) {
      const packageId = Number(projectId);
      setScope(packageId).then(() => {
        // Navigate to main BOM page (modal will still open per requirements)
        navigate('/bom');
      });
    }
  }, [projectId, setScope, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );
}
