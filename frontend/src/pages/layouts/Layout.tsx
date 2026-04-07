import React, { useEffect } from "react";
// import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css'; // Import the toast styles
import Sidebar from "../components/Sidebar";

type Props = {
    children: React.ReactNode;
}

const Layout = ({children}: Props) => {
    useEffect(() => {
        setTimeout(() => {
            // Check if the flag exists in sessionStorage
            const showToast = sessionStorage.getItem("showSuccessToast");
            if (showToast === "true") {
                toast.success("Sign In Successfully!", {
                    position: 'top-right',
                    autoClose: 2000
                });
                // Delay removing the flag to ensure the toast is displayed
                // setTimeout(() => {
                    sessionStorage.removeItem("showSuccessToast");
                // }, 2000); // Slightly longer than the toast autoClose time
            }
        }, 100); // Small delay to ensure the page has fully loaded
    }, []);
    return (
        <>
            <ToastContainer newestOnTop={true}/>
            <div className="main-container min-h-screen text-black dark:text-white-dark navbar-sticky">
                {/* start sidebar section */}
                <Sidebar />
                {/* end sidebar section */}
                <div className="main-content flex min-h-screen flex-col">

                    {/* start header section */}
                    <Header />
                    {/* end header section */}

                    <div className="dvanimation animate__animated p-6">{children}</div>

                    {/* start footer section */}
                    <Footer />
                    {/* end footer section */}

                </div>
                
            </div>
        </>
    );
};

export default Layout;