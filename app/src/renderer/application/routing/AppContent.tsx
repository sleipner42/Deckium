import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LintingPanel } from '../components/common/LintingPanel';
import LLMSettingsDialog from '../components/common/LLMSettingsDialog';
import FullScreenPresentationViewer from '../components/presentation/FullScreenPresentationViewer';
import PresentationEditor from '../components/presentation/PresentationEditor';
import PresentationViewer from '../components/presentation/PresentationViewer';

const AppContent: React.FC = () => {
    const location = useLocation();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const searchParams = new URLSearchParams(location.search);
    const layout = searchParams.get('layout') || 'editor';

    // Listen for menu event to open LLM settings
    useEffect(() => {
        const unsubscribe = window.electron.ipcRenderer.on(
            'menu:open-llm-settings',
            () => {
                setIsSettingsOpen(true);
            },
        );

        return () => {
            unsubscribe();
        };
    }, []);

    if (layout === 'fullscreen') {
        return <FullScreenPresentationViewer />;
    }

    return (
        <>
            {layout === 'editor' ? (
                <PresentationEditor />
            ) : (
                <PresentationViewer />
            )}
            <LintingPanel />
            <LLMSettingsDialog
                open={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </>
    );
};

export default AppContent;
