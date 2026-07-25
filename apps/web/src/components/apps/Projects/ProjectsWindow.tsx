import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import PortfolioPasswordDialog from '@/components/apps/Projects/PortfolioPasswordDialog';
import ProjectsErrorState from '@/components/apps/Projects/ProjectsErrorState';
import ProjectsLoadingState from '@/components/apps/Projects/ProjectsLoadingState';
import ProjectsOverview from '@/components/apps/Projects/ProjectsOverview';
import ProjectsSidebar from '@/components/apps/Projects/ProjectsSidebar';
import ProjectsToolbar from '@/components/apps/Projects/ProjectsToolbar';
import Window from '@/components/window/Window';
import { initializeContentIndex, useContentIndex } from '@/lib/contentIndex';
import { useWindowLifecycle } from '@/lib/hooks/useWindowLifecycle';
import { getProjectBySlug, getProjects } from '@/lib/projectsContent';
import { showCompactNotification } from '@/stores/notificationHelpers';
import { usePortfolioAccessStore } from '@/stores/usePortfolioAccessStore';
import { type Window as WindowType, useWindowStore } from '@/stores/useWindowStore';

const CaseStudyArticle = lazy(() => import('@/components/apps/Projects/CaseStudyArticle'));

interface ProjectsWindowProps {
  window: WindowType;
  isActive: boolean;
}

const ProjectsWindow = ({ window: windowData, isActive }: ProjectsWindowProps) => {
  const [showSidebar, setShowSidebar] = useState(true);
  const isIndexed = useContentIndex((state) => state.isIndexed);
  const updateWindow = useWindowStore((state) => state.updateWindow);
  const accessStatus = usePortfolioAccessStore((state) => state.status);
  const initializeAccess = usePortfolioAccessStore((state) => state.initialize);
  const unlock = usePortfolioAccessStore((state) => state.unlock);
  const lock = usePortfolioAccessStore((state) => state.lock);

  const { handleClose, handleFocus, handleMinimize, handleDragEnd, handleResize } =
    useWindowLifecycle({
      window: windowData,
      isActive,
    });

  useEffect(() => {
    initializeAccess();
  }, [initializeAccess]);

  useEffect(() => {
    if (!useContentIndex.getState().isIndexed) {
      initializeContentIndex();
    }
  }, []);

  const projects = useMemo(() => (isIndexed ? getProjects() : []), [isIndexed]);
  const selectedProject = useMemo(() => {
    if (!isIndexed || !windowData.projectSlug) return undefined;
    return getProjectBySlug(windowData.projectSlug);
  }, [isIndexed, windowData.projectSlug]);

  const handleSelectProject = (slug?: string) => {
    updateWindow(windowData.id, { projectSlug: slug }, { skipRouteSync: false });
  };

  const handleCopyLink = async () => {
    if (!windowData.projectSlug) return;

    try {
      await navigator.clipboard.writeText(window.location.href);
      showCompactNotification('URL Copied', 'Case study link copied to clipboard', {
        type: 'success',
      });
    } catch {
      showCompactNotification('Copy Failed', 'Unable to copy the case study link');
    }
  };

  const windowTitle = selectedProject
    ? `${selectedProject.title} — Selected Work`
    : 'Selected Work';
  const isUnlocked = accessStatus === 'unlocked';

  return (
    <Window
      id={windowData.id}
      title={windowTitle}
      isActive={isActive}
      position={windowData.position}
      size={windowData.size}
      zIndex={windowData.zIndex}
      onClose={handleClose}
      onMinimize={handleMinimize}
      onFocus={handleFocus}
      onDragEnd={handleDragEnd}
      onResize={handleResize}
    >
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white">
        {isUnlocked ? (
          <>
            <ProjectsToolbar
              hasSelectedProject={Boolean(windowData.projectSlug)}
              showSidebar={showSidebar}
              onShowAll={() => handleSelectProject()}
              onToggleSidebar={() => setShowSidebar((isVisible) => !isVisible)}
              onCopyLink={handleCopyLink}
              onLock={lock}
            />
            <div className="flex min-h-0 flex-1 overflow-hidden">
              {showSidebar ? (
                <ProjectsSidebar
                  projects={projects}
                  selectedSlug={windowData.projectSlug}
                  onSelectProject={handleSelectProject}
                />
              ) : null}
              <main className="min-w-0 flex-1">
                {!isIndexed ? (
                  <ProjectsLoadingState />
                ) : windowData.projectSlug && !selectedProject ? (
                  <ProjectsErrorState
                    title="Case study not found"
                    message="This project is unavailable or the link is incorrect."
                    actionLabel="All Projects"
                    onAction={() => handleSelectProject()}
                  />
                ) : selectedProject ? (
                  <Suspense
                    fallback={
                      <ProjectsLoadingState message={`Loading ${selectedProject.title}…`} />
                    }
                  >
                    <CaseStudyArticle
                      project={selectedProject}
                      onBack={() => handleSelectProject()}
                    />
                  </Suspense>
                ) : (
                  <ProjectsOverview projects={projects} onSelectProject={handleSelectProject} />
                )}
              </main>
            </div>
          </>
        ) : accessStatus === 'misconfigured' ? (
          <ProjectsErrorState
            title="Portfolio access is not configured"
            message="Set VITE_PORTFOLIO_PASSWORD_HASH and rebuild the web application."
            actionLabel="Close"
            onAction={handleClose}
          />
        ) : (
          <div className="aqua-pinstripe h-full">
            <PortfolioPasswordDialog
              isChecking={accessStatus === 'checking'}
              onCancel={handleClose}
              onUnlock={unlock}
            />
          </div>
        )}
      </div>
    </Window>
  );
};

export default ProjectsWindow;
