import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppContext } from '../../hooks/useAppContext';
import SignOutButton from "./SignOutbutton";

type ActiveDiv = 'div1' | 'div2' | null;
const Header: React.FC = () => {
    // const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const { t } = useTranslation();
    const { language, setLanguage } = useLanguage();

    const { toggleSidebar, isLoggedIn, user } = useAppContext();

    const handleClick = () => {
        toggleSidebar();
        document.body.classList.toggle('toggle-sidebar');
    };
    

    // const handleClick = () => {
    //     setIsSidebarOpen(!isSidebarOpen);
    //     document.body.classList.toggle('toggle-sidebar');
    // };

    // State to track the currently active div
    const [activeDiv, setActiveDiv] = useState<ActiveDiv>(null);

    // Function to toggle the active div
    const toggleActiveDiv = (divName: ActiveDiv) => {
        setActiveDiv(divName === activeDiv ? null : divName);
    };

    // Ref to track the dropdown menu
    const dropdownRef = useRef<HTMLUListElement | null>(null);
    // Close the dropdown if clicked outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDiv(null);  // Close the dropdown if click is outside
            }
        };

        // Add event listener
        document.addEventListener("mousedown", handleClickOutside);

        // Cleanup the event listener on component unmount
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <>
            <header className="z-40 ">
                <div className="shadow-sm">
                    <div className="relative flex w-full items-center bg-white px-5 py-2.5 dark:bg-[#0e1726]">
                        <div className="horizontal-logo flex items-center justify-between ltr:mr-2 rtl:ml-2 lg:hidden">
                            <Link to="/dashboard" className="main-logo flex shrink-0 items-center">
                                <img style={{ width: "4rem" }} className="inline ltr:-ml-1 rtl:-mr-1" src={`${import.meta.env.BASE_URL}admin_assets/images/izoom-logo.png`} alt="Company logo" />
                                {/* <span className="hidden align-middle text-2xl font-semibold transition-all duration-300 ltr:ml-1.5 rtl:mr-1.5 dark:text-white-light md:inline">Lorn Titya</span> */}
                            </Link>

                            <button
                                onClick={handleClick}
                                className="collapse-icon flex flex-none rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary ltr:ml-2 rtl:mr-2 dark:bg-dark/40 dark:text-[#d0d2d6] dark:hover:bg-dark/60 dark:hover:text-primary lg:hidden"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 7L4 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <path opacity="0.5" d="M20 12L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M20 17L4 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        {/* Start Blog of icon like calendar, chart and so on */}
                        {/* <div className="hidden ltr:mr-2 rtl:ml-2 sm:block">
                            <ul className="flex items-center space-x-2 rtl:space-x-reverse dark:text-[#d0d2d6]">
                                <li>
                                    <a
                                        href="apps-calendar.html"
                                        className="block rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                d="M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12V14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V12Z"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                            />
                                            <path opacity="0.5" d="M7 4V2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            <path opacity="0.5" d="M17 4V2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            <path opacity="0.5" d="M2 9H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                    </a>
                                </li>
                            </ul>
                        </div> */}
                        {/* End Blog of icon like calendar, chart and so on */}

                        <div
                            x-data="header"
                            className="flex items-center space-x-1.5 ltr:ml-auto rtl:mr-auto rtl:space-x-reverse dark:text-[#d0d2d6] sm:flex-1 ltr:sm:ml-0 sm:rtl:mr-0 lg:space-x-2"
                        >
                            {/* Start Search Option */}
                            <div className="sm:ltr:mr-auto sm:rtl:ml-auto" x-data="{ search: false }">
                                {/* <form
                                    className="absolute inset-x-0 top-1/2 z-10 mx-4 hidden -translate-y-1/2 sm:relative sm:top-0 sm:mx-0 sm:block sm:translate-y-0 {'!block' : search}"
                                >
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="peer form-input bg-gray-100 placeholder:tracking-widest ltr:pl-9 ltr:pr-9 rtl:pl-9 rtl:pr-9 sm:bg-transparent ltr:sm:pr-4 rtl:sm:pl-4"
                                            placeholder="Search..."
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-0 h-9 w-9 appearance-none peer-focus:text-primary ltr:right-auto rtl:left-auto"
                                        >
                                            <svg className="mx-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="11.5" cy="11.5" r="9.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                                                <path d="M18.5 18.5L22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            className="absolute top-1/2 block -translate-y-1/2 hover:opacity-80 ltr:right-2 rtl:left-2 sm:hidden"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle opacity="0.5" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                                                <path
                                                    d="M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </form>
                                <button
                                    type="button"
                                    className="search_btn rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 dark:bg-dark/40 dark:hover:bg-dark/60 sm:hidden"
                                >
                                    <svg
                                        className="mx-auto h-4.5 w-4.5 dark:text-[#d0d2d6]"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <circle cx="11.5" cy="11.5" r="9.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                                        <path d="M18.5 18.5L22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                </button> */}
                            </div>
                            {/* End Search Option */}



                            {/* <div>
                                <label>{t('language')}:</label>
                                <button onClick={() => setLanguage('en')}>{t('english')}</button>
                                <button onClick={() => setLanguage('kh')}>{t('khmer')}</button> */}
                                {/* <a href="javascript:;" x-show="$store.app.theme === 'light'" className="flex items-center rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.5"></circle>
                                        <path d="M12 2V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                                        <path d="M12 20V22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                                        <path d="M4 12L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                                        <path d="M22 12L20 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                                        <path opacity="0.5" d="M19.7778 4.22266L17.5558 6.25424" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                                        <path opacity="0.5" d="M4.22217 4.22266L6.44418 6.25424" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                                        <path opacity="0.5" d="M6.44434 17.5557L4.22211 19.7779" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                                        <path opacity="0.5" d="M19.7778 19.7773L17.5558 17.5551" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                                    </svg>
                                </a> */}
                            {/* </div> */}
                            
                            {/* Start Flag Option */}
                            {/* <div className="dropdown shrink-0" x-data="dropdown">
                                <button
                                    className="block rounded-full bg-white-light/40 p-2 hover:bg-white-light/90 hover:text-primary dark:bg-dark/40 dark:hover:bg-dark/60"
                                    onClick={() => toggleActiveDiv('div1')}
                                >
                                    <img src="/../admin_assets/images/card-visa.svg"
                                        alt="Company logo"
                                        className="h-5 w-5 rounded-full object-cover"
                                    />
                                </button>
                                {activeDiv === 'div1' &&
                                    <ul
                                        ref={dropdownRef}
                                        className="top-11 grid w-[280px] grid-cols-2 gap-y-2 !px-2 font-semibold text-dark ltr:-right-14 rtl:-left-14 dark:text-white-dark dark:text-white-light/90 sm:ltr:-right-2 sm:rtl:-left-2"
                                    >
                                            <li>
                                                <a
                                                    href=""
                                                    className="hover:text-primary"
                                                >
                                                    <img
                                                        className="h-5 w-5 rounded-full object-cover"
                                                        src="/../admin_assets/images/card-visa.svg"
                                                        alt="Company logo"
                                                    />
                                                    <span className="ltr:ml-3 rtl:mr-3"></span>
                                                </a>
                                            </li>
                                    </ul>
                                }
                            </div> */}
                            {/* End Flag Option */}
                            
                            {/* Start Profile Option */}
                            <div className="dropdown flex-shrink-0" x-data="dropdown">
                                <button className="group relative" onClick={() => toggleActiveDiv('div2')}>
                                    <span>
                                        <img
                                            className="h-9 w-9 rounded-full object-cover saturate-50 group-hover:saturate-100"
                                            src={`${import.meta.env.BASE_URL}admin_assets/images/user-profile.jpg`}
                                            alt="Company logo" />
                                    </span>
                                </button>
                                {activeDiv === 'div2' &&
                                <ul
                                    ref={dropdownRef}
                                    className="top-11 w-[230px] !py-0 font-semibold text-dark ltr:right-0 rtl:left-0 dark:text-white-dark dark:text-white-light/90"
                                >
                                    <li>
                                        <div className="flex items-center px-4 py-4">
                                            <div className="flex-none">
                                                <img className="h-10 w-10 rounded-md object-cover" src={`${import.meta.env.BASE_URL}admin_assets/images/user-profile.jpg`} alt="Company logo" />
                                            </div>
                                            <div className="truncate ltr:pl-4 rtl:pr-4">
                                                {isLoggedIn ? (
                                                        <>
                                                            <h4 className="text-base">
                                                                {user?.name}
                                                            </h4>
                                                            <a
                                                                className="text-black/60 hover:text-primary dark:text-dark-light/60 dark:hover:text-white"
                                                                href=""
                                                                >{user?.email || "Email"}
                                                            </a>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <h4 className="text-base">
                                                                UnKnow<span className="rounded bg-success-light px-1 text-xs text-success ltr:ml-2 rtl:ml-2">Pro</span>
                                                            </h4>
                                                            <a
                                                                className="text-black/60 hover:text-primary dark:text-dark-light/60 dark:hover:text-white"
                                                                href=""
                                                                >UnKnow@gmail.com
                                                            </a>
                                                        </>
                                                    )
                                                }
                                                
                                            </div>
                                        </div>
                                    </li>
                                    <li className="border-t border-white-light dark:border-white-light/10">
                                        <SignOutButton />
                                    </li>
                                </ul>
                                }
                            </div>
                            {/* End Profile Option */}
                        </div>
                    </div>
                    {/* horizontal menu */}
                    <ul
                        className="horizontal-menu hidden border-t border-[#ebedf2] bg-white px-6 py-1.5 font-semibold text-black rtl:space-x-reverse dark:border-[#191e3a] dark:bg-[#0e1726] dark:text-white-dark lg:space-x-1.5 xl:space-x-8"
                    >
                        <li className="menu nav-item relative">
                            <a href="" className="nav-link active">
                                <div className="flex items-center">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                                        <path
                                            opacity="0.5"
                                            d="M2 12.2039C2 9.91549 2 8.77128 2.5192 7.82274C3.0384 6.87421 3.98695 6.28551 5.88403 5.10813L7.88403 3.86687C9.88939 2.62229 10.8921 2 12 2C13.1079 2 14.1106 2.62229 16.116 3.86687L18.116 5.10812C20.0131 6.28551 20.9616 6.87421 21.4808 7.82274C22 8.77128 22 9.91549 22 12.2039V13.725C22 17.6258 22 19.5763 20.8284 20.7881C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.7881C2 19.5763 2 17.6258 2 13.725V12.2039Z"
                                            fill="currentColor"
                                        />
                                        <path
                                            d="M9 17.25C8.58579 17.25 8.25 17.5858 8.25 18C8.25 18.4142 8.58579 18.75 9 18.75H15C15.4142 18.75 15.75 18.4142 15.75 18C15.75 17.5858 15.4142 17.25 15 17.25H9Z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                    <span className="px-1">Dashboard</span>
                                </div>
                                <div className="right_arrow">
                                    <svg
                                        className="h-4 w-4 rotate-90"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path d="M9 5L15 12L9 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </a>
                            <ul className="sub-menu">
                                <li>
                                    <a href="index-2.html" className="active">Sales</a>
                                </li>
                                <li>
                                    <a href="analytics.html">Analytics</a>
                                </li>
                                <li>
                                    <a href="finance.html">Finance</a>
                                </li>
                                <li>
                                    <a href="crypto.html">Crypto</a>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </header>
        </>
    )
};

export default Header;
