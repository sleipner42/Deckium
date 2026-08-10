import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import App from '../renderer/App';

jest.mock('../renderer/application/context/AuthContext', () => ({
    AuthProvider: ({ children }: PropsWithChildren) => children,
}));
jest.mock('../renderer/application/context/PresentationContext', () => ({
    PresentationProvider: ({ children }: PropsWithChildren) => children,
}));
jest.mock('../renderer/application/context/LintingContext', () => ({
    LintingProvider: ({ children }: PropsWithChildren) => children,
}));
jest.mock('../renderer/application/context/TextEditingContext', () => ({
    TextEditingProvider: ({ children }: PropsWithChildren) => children,
}));
jest.mock('../renderer/application/context/AIContext', () => ({
    AIProvider: ({ children }: PropsWithChildren) => children,
}));
jest.mock('../renderer/application/routing/AppContent', () => () => (
    <div>Deckium</div>
));

describe('App', () => {
    it('should render', () => {
        render(<App />);
        expect(screen.getByText('Deckium')).toBeInTheDocument();
    });
});
