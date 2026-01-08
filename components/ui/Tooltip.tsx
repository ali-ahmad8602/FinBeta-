"use client";

import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
    content: string | React.ReactNode;
    children?: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="relative inline-block">
            <button
                type="button"
                className="inline-flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 rounded"
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onClick={() => setIsVisible(!isVisible)}
                onBlur={() => setIsVisible(false)}
                aria-label="More information"
            >
                {children || <Info className="w-3.5 h-3.5" />}
            </button>

            {isVisible && (
                <div className="absolute z-50 w-72 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-xl bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none">
                    <div className="space-y-1">
                        {typeof content === 'string' ? (
                            <p className="whitespace-pre-line">{content}</p>
                        ) : (
                            content
                        )}
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                        <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface InfoIconProps {
    content: string | React.ReactNode;
}

export const InfoIcon: React.FC<InfoIconProps> = ({ content }) => {
    return <Tooltip content={content} />;
};
