import React from "react";
import { NavLink } from "react-router-dom";

const NotFound: React.FC = () => {
    return (
        <>
            <div className="main-container min-h-screen text-black dark:text-white-dark">
                <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
                    <div
                        className="px-6 py-16 text-center font-semibold before:container before:absolute before:left-1/2 before:aspect-square before:-translate-x-1/2 before:rounded-full before:bg-[linear-gradient(180deg,#4361EE_0%,rgba(67,97,238,0)_50.73%)] before:opacity-10 md:py-20"
                    >
                        <div className="relative">
                            <h1 style={{ fontSize: '40px', fontWeight: 'bolder' }}>Not Found!</h1>
                            <p className="mt-5 text-base dark:text-white">The page you requested was not found!</p>
                            <NavLink to="/dashboard" className="btn btn-gradient mx-auto !mt-7 w-max border-0 uppercase shadow-none">Home</NavLink>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default NotFound;