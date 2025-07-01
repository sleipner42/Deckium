import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary';
    size?: 'small' | 'medium' | 'large';
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'medium',
    className,
    ...props
}) => {
    return (
        <button
            className={`button ${variant} ${size} ${className || ''}`}
            {...props}
        >
            {children}
        </button>
    );
};
