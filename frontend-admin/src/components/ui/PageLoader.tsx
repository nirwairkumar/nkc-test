import React from 'react';

export default function PageLoader() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] animate-bounce [animation-delay:-0.32s]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#F4B838] animate-bounce [animation-delay:-0.16s]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] animate-bounce"></span>
            </div>
        </div>
    );
}
