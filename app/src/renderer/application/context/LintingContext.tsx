import React, { createContext, ReactNode, useContext } from 'react';
import { Slide } from '../../../common/domain/entities/types';
import { useMainProcessLinting } from '../hooks/useMainProcessLinting';

interface LintingError {
    id: string;
    elementId: string;
    slideId: string;
    type: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    suggestedFix?: string;
    createdAt: Date;
}

interface SlideLintingResult {
    slideId: string;
    errors: LintingError[];
    hasErrors: boolean;
    lintedAt: Date;
}

interface LintingContextState {
    allErrors: LintingError[];
    errorsBySlide: Map<string, LintingError[]>;
    isLinting: boolean;
}

interface LintingContextActions {
    lintSlide: (slide: Slide) => Promise<SlideLintingResult>;
    getLintingErrors: (slideId?: string) => Promise<LintingError[]>;
    clearErrors: (slideId?: string) => Promise<void>;
    hasErrors: (slideId?: string) => Promise<boolean>;
    getErrorsBySeverity: (
        severity: 'error' | 'warning' | 'info',
    ) => Promise<LintingError[]>;
    getSlideErrors: (slideId: string) => LintingError[];
    getErrorCount: (severity?: 'error' | 'warning' | 'info') => number;
    hasSlideErrors: (slideId: string) => boolean;
}

export interface LintingContextValue
    extends LintingContextState,
        LintingContextActions {}

const LintingContext = createContext<LintingContextValue | null>(null);

interface LintingProviderProps {
    children: ReactNode;
}

export const LintingProvider: React.FC<LintingProviderProps> = ({
    children,
}) => {
    const {
        allErrors,
        errorsBySlide,
        isLinting,
        lintSlide,
        getLintingErrors,
        clearErrors,
        hasErrors,
        getErrorsBySeverity,
        getSlideErrors,
        getErrorCount,
        hasSlideErrors,
    } = useMainProcessLinting();

    const value: LintingContextValue = {
        allErrors,
        errorsBySlide,
        isLinting,
        lintSlide,
        getLintingErrors,
        clearErrors,
        hasErrors,
        getErrorsBySeverity,
        getSlideErrors,
        getErrorCount,
        hasSlideErrors,
    };

    return (
        <LintingContext.Provider value={value}>
            {children}
        </LintingContext.Provider>
    );
};

export const useLinting = () => {
    const context = useContext(LintingContext);
    if (!context) {
        throw new Error('useLinting must be used within a LintingProvider');
    }
    return context;
};
