import React, { useState } from "react";
import { useLocation } from 'react-router-dom';
// import { AppContext } from "../../contexts/AppContext";
import { useAppContext } from '../../hooks/useAppContext';
import { NavLink } from "react-router-dom";
import {
    ChartColumnStacked,
    Users,
    GitBranchPlus,
    AlignEndHorizontal,
    LayoutList,
    Tags,
    Boxes,
    SquareUserRound,
    ShoppingCart,
    HeartHandshake,
    TextQuote,
    FilePenLine,
    Layers,
    Layers2,
    FolderSync,
    HandHelping,
    HandCoins,
    BanknoteArrowDown,
    BanknoteArrowUp,
    CircleOff,
    CircleDollarSign,
    BadgeDollarSign,
    FileKey,
    Undo2,
    ArrowDownNarrowWide,
    Activity,
    ChartCandlestick,
    Wallet,
    MonitorSmartphone,
    ScanBarcode,
    Store,
    Landmark,
    TrendingUp,
    UserCheck
} from 'lucide-react';

// Define a type for the state
// type activeDropdown = 'user' | 'invoice' | 'error_list' | null;
type activeDropdown = 'dashboard' | 'user' | null;
// type activeDropdownSub = 'error_list' | null;

const Sidebar: React.FC = () => {
    const location = useLocation();
    const lastSegment = location.pathname.split('/').filter(Boolean).pop() ?? "";
    const segments = location.pathname.split('/').filter(Boolean);
    
    const defaultClass = 'group'; // Your default class

    const { toggleSidebar, hasPermission } = useAppContext();

    const handleClick = () => {
        toggleSidebar();
        document.body.classList.toggle('toggle-sidebar');
    };

    const determineActiveDropdown = (segment: string): activeDropdown => {
        switch (segment) {
            case 'user':
                return 'user';
            case 'dashboard':
                return 'dashboard';
            // case 'invoice':
            // case 'error_list': // Add other segments that should open the invoice dropdown
            //     return 'invoice';
            default:
                return null;
        }
    };

    const getInitialDropdownState = (): activeDropdown => {
        const savedDropdown = localStorage.getItem('activeDropdown');
        return savedDropdown ? (savedDropdown as activeDropdown) : determineActiveDropdown(lastSegment);
    };

    const [activeDropdown, setActiveDropdown] = useState<activeDropdown>(getInitialDropdownState());

    const handleToggleMenu = (labelName: activeDropdown) => {
        const newActiveDropdown = labelName === activeDropdown ? activeDropdown : labelName;
        setActiveDropdown(newActiveDropdown);
        // setActiveDropdown(prev => (prev === activeDropdown ? null : activeDropdown));
        localStorage.setItem('activeDropdown', newActiveDropdown || '');
    };

    const canViewUser =
        hasPermission('User-View') ||
        hasPermission('Role-View') ||
        hasPermission('Permission-View');
    

    return (
        <div className="{'dark text-white-dark' : $store.app.semidark}">
            <nav
                x-data="sidebar"
                className="sidebar fixed bottom-0 top-0 z-50 h-full min-h-screen w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] transition-all duration-300"
            >
                <div className="h-full bg-white dark:bg-[#0e1726]">
                    <div className="flex items-center justify-between px-4 py-3">
                        <NavLink to="/dashboard" className="main-logo flex shrink-0 items-center">
                            <img style={{ width: "8rem" }} className="ml-[5px] flex-none" src={`${import.meta.env.BASE_URL}admin_assets/images/izoom-logo.png`} alt="Company logo" />
                            {/* <span className="align-middle text-2xl font-semibold ltr:ml-1.5 rtl:mr-1.5 dark:text-white-light lg:inline">Lorn Titya</span> */}
                        </NavLink>
                        <button
                            onClick={handleClick}
                            className="collapse-icon flex h-8 w-8 items-center rounded-full transition duration-300 hover:bg-gray-500/10 rtl:rotate-180 dark:text-white-light dark:hover:bg-dark-light/10"
                        >
                            <svg className="m-auto h-5 w-5" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13 19L7 12L13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path
                                    opacity="0.5"
                                    d="M16.9998 19L10.9998 12L16.9998 5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                    </div>
                    <ul
                        className="perfect-scrollbar relative h-[calc(100vh-80px)] space-y-0.5 overflow-y-auto overflow-x-hidden p-4 py-0 font-semibold"
                    >

                        {/* Start I comment this blog for example use later on */}
                            {(
                                hasPermission('Branch-View') ||
                                canViewUser ||
                                hasPermission('Customer-View') ||
                                hasPermission('Supplier-View') ||
                                hasPermission('Customer-Equipment-View')
                            ) && (
                                <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                    <svg
                                        className="hidden h-5 w-4 flex-none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    <span>People</span>
                                </h2>
                            )}

                            {hasPermission('Branch-View') &&
                                <li className="nav-item">
                                    <ul>
                                        <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                            <NavLink to="/branches" className={({ isActive }) => `${defaultClass} ${isActive ? 'active' : ''}`.trim()}>
                                                <div className="flex items-center">
                                                    <GitBranchPlus />
                                                    <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Branches</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                    </ul>
                                </li>
                            }

                            {canViewUser && (
                                <li className="menu nav-item">
                                    <button
                                        type="button"
                                        className={`nav-link group ${activeDropdown == 'user' ? 'active' : ''}`}
                                        onClick={() => handleToggleMenu('user')}
                                    >
                                        <div className="flex items-center">
                                            <Users />

                                            <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Users</span>
                                        </div>
                                        <div className={`rtl:rotate-180 ${activeDropdown == 'user' ? '!rotate-90' : ''}`}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M9 5L15 12L9 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </button>
                                    <ul className={`sub-menu text-gray-500 collapsible ${activeDropdown == 'user' ? 'expanded' : ''}`}>
                                        {hasPermission('User-View') &&
                                            <li>
                                                <NavLink to="/user" className={`${['user','adduser','edituser'].includes(segments[0]) ? 'active' : ''}`}>Users</NavLink>
                                            </li>
                                        }
                                        {hasPermission('Role-View') &&
                                            <li>
                                                <NavLink to="/role" className={`${['role','addrole','editrole'].includes(segments[0]) ? 'active' : ''}`}>Roles</NavLink>
                                            </li>
                                        }
                                        {hasPermission('Permission-View') &&
                                            <li>
                                                <NavLink to="/modulepermission" className={`${segments[0] == 'permission' ? 'active' : ''}`}>Permissions</NavLink>
                                            </li>
                                        }
                                    </ul>
                                </li>
                            )}

                            {hasPermission('Customer-View') &&
                                <li className="nav-item">
                                    <ul>
                                        <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                            <NavLink to="/customer" className={({ isActive }) => `${defaultClass} ${isActive ? 'active' : ''}`.trim()}>
                                                <div className="flex items-center">
                                                    <Users />
                                                    <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Customers</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                    </ul>
                                </li>
                            }

                            {hasPermission('Customer-Equipment-View') &&
                                <li className="nav-item">
                                    <ul>
                                        <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                            <NavLink
                                                to="/customerequipment"
                                                className={['customerequipment'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                            >
                                                <div className="flex items-center">
                                                    <MonitorSmartphone />
                                                    <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Customer Equipment</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                    </ul>
                                </li>
                            }

                            {hasPermission('Supplier-View') &&
                                <li className="nav-item">
                                    <ul>
                                        <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                            <NavLink to="/supplier" className={({ isActive }) => `${defaultClass} ${isActive ? 'active' : ''}`.trim()}>
                                                <div className="flex items-center">
                                                    <SquareUserRound />
                                                    <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Suppliers</span>
                                                </div>
                                            </NavLink>
                                        </li>
                                    </ul>
                                </li>
                            }

                            {/* <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <svg
                                    className="hidden h-5 w-4 flex-none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>Apps</span>
                            </h2>

                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item">
                                        <a href="apps-chat.html" className="group">
                                            <div className="flex items-center">
                                                <svg
                                                    className="shrink-0 group-hover:!text-primary"
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        clipRule="evenodd"
                                                        d="M10.4036 22.4797L10.6787 22.015C11.1195 21.2703 11.3399 20.8979 11.691 20.6902C12.0422 20.4825 12.5001 20.4678 13.4161 20.4385C14.275 20.4111 14.8523 20.3361 15.3458 20.1317C16.385 19.7012 17.2106 18.8756 17.641 17.8365C17.9639 17.0571 17.9639 16.0691 17.9639 14.093V13.2448C17.9639 10.4683 17.9639 9.08006 17.3389 8.06023C16.9892 7.48958 16.5094 7.0098 15.9388 6.66011C14.919 6.03516 13.5307 6.03516 10.7542 6.03516H8.20964C5.43314 6.03516 4.04489 6.03516 3.02507 6.66011C2.45442 7.0098 1.97464 7.48958 1.62495 8.06023C1 9.08006 1 10.4683 1 13.2448V14.093C1 16.0691 1 17.0571 1.32282 17.8365C1.75326 18.8756 2.57886 19.7012 3.61802 20.1317C4.11158 20.3361 4.68882 20.4111 5.5477 20.4385C6.46368 20.4678 6.92167 20.4825 7.27278 20.6902C7.6239 20.8979 7.84431 21.2703 8.28514 22.015L8.5602 22.4797C8.97002 23.1721 9.9938 23.1721 10.4036 22.4797ZM13.1928 14.5171C13.7783 14.5171 14.253 14.0424 14.253 13.4568C14.253 12.8713 13.7783 12.3966 13.1928 12.3966C12.6072 12.3966 12.1325 12.8713 12.1325 13.4568C12.1325 14.0424 12.6072 14.5171 13.1928 14.5171ZM10.5422 13.4568C10.5422 14.0424 10.0675 14.5171 9.48193 14.5171C8.89637 14.5171 8.42169 14.0424 8.42169 13.4568C8.42169 12.8713 8.89637 12.3966 9.48193 12.3966C10.0675 12.3966 10.5422 12.8713 10.5422 13.4568ZM5.77108 14.5171C6.35664 14.5171 6.83133 14.0424 6.83133 13.4568C6.83133 12.8713 6.35664 12.3966 5.77108 12.3966C5.18553 12.3966 4.71084 12.8713 4.71084 13.4568C4.71084 14.0424 5.18553 14.5171 5.77108 14.5171Z"
                                                        fill="currentColor"
                                                    />
                                                    <path
                                                        opacity="0.5"
                                                        d="M15.486 1C16.7529 0.999992 17.7603 0.999986 18.5683 1.07681C19.3967 1.15558 20.0972 1.32069 20.7212 1.70307C21.3632 2.09648 21.9029 2.63623 22.2963 3.27821C22.6787 3.90219 22.8438 4.60265 22.9226 5.43112C22.9994 6.23907 22.9994 7.24658 22.9994 8.51343V9.37869C22.9994 10.2803 22.9994 10.9975 22.9597 11.579C22.9191 12.174 22.8344 12.6848 22.6362 13.1632C22.152 14.3323 21.2232 15.2611 20.0541 15.7453C20.0249 15.7574 19.9955 15.7691 19.966 15.7804C19.8249 15.8343 19.7039 15.8806 19.5978 15.915H17.9477C17.9639 15.416 17.9639 14.8217 17.9639 14.093V13.2448C17.9639 10.4683 17.9639 9.08006 17.3389 8.06023C16.9892 7.48958 16.5094 7.0098 15.9388 6.66011C14.919 6.03516 13.5307 6.03516 10.7542 6.03516H8.20964C7.22423 6.03516 6.41369 6.03516 5.73242 6.06309V4.4127C5.76513 4.29934 5.80995 4.16941 5.86255 4.0169C5.95202 3.75751 6.06509 3.51219 6.20848 3.27821C6.60188 2.63623 7.14163 2.09648 7.78361 1.70307C8.40759 1.32069 9.10805 1.15558 9.93651 1.07681C10.7445 0.999986 11.7519 0.999992 13.0188 1H15.486Z"
                                                        fill="currentColor"
                                                    />
                                                </svg>
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Chat</span>
                                            </div>
                                        </a>
                                    </li>
                                    <li className="menu nav-item">
                                        <button
                                            type="button"
                                            className={`nav-link group ${activeDropdown == 'invoice' ? 'active' : ''}`}
                                            onClick={() => handleToggleMenu('invoice')}
                                        >
                                            <div className="flex items-center">
                                                <svg
                                                    className="shrink-0 group-hover:!text-primary"
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <path
                                                        opacity="0.5"
                                                        fillRule="evenodd"
                                                        clipRule="evenodd"
                                                        d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
                                                        fill="currentColor"
                                                    />
                                                    <path
                                                        fillRule="evenodd"
                                                        clipRule="evenodd"
                                                        d="M12 5.25C12.4142 5.25 12.75 5.58579 12.75 6V6.31673C14.3804 6.60867 15.75 7.83361 15.75 9.5C15.75 9.91421 15.4142 10.25 15 10.25C14.5858 10.25 14.25 9.91421 14.25 9.5C14.25 8.82154 13.6859 8.10339 12.75 7.84748V11.3167C14.3804 11.6087 15.75 12.8336 15.75 14.5C15.75 16.1664 14.3804 17.3913 12.75 17.6833V18C12.75 18.4142 12.4142 18.75 12 18.75C11.5858 18.75 11.25 18.4142 11.25 18V17.6833C9.61957 17.3913 8.25 16.1664 8.25 14.5C8.25 14.0858 8.58579 13.75 9 13.75C9.41421 13.75 9.75 14.0858 9.75 14.5C9.75 15.1785 10.3141 15.8966 11.25 16.1525V12.6833C9.61957 12.3913 8.25 11.1664 8.25 9.5C8.25 7.83361 9.61957 6.60867 11.25 6.31673V6C11.25 5.58579 11.5858 5.25 12 5.25ZM11.25 7.84748C10.3141 8.10339 9.75 8.82154 9.75 9.5C9.75 10.1785 10.3141 10.8966 11.25 11.1525V7.84748ZM14.25 14.5C14.25 13.8215 13.6859 13.1034 12.75 12.8475V16.1525C13.6859 15.8966 14.25 15.1785 14.25 14.5Z"
                                                        fill="currentColor"
                                                    />
                                                </svg>
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Invoice</span>
                                            </div>
                                            <div className={`rtl:rotate-180 ${activeDropdown == 'invoice' ? '!rotate-90' : ''}`}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path
                                                        d="M9 5L15 12L9 19"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>
                                        </button>
                                        <ul className={`sub-menu text-gray-500 collapsible ${activeDropdown == 'invoice' ? 'expanded' : ''}`}>
                                            <li>
                                                <a href="apps-invoice-list.html">List</a>
                                            </li>
                                            <li x-data="{subActive:null}">
                                                <button
                                                    type="button"
                                                    className="before:h-[5px] before:w-[5px] before:rounded before:bg-gray-300 hover:bg-gray-100 ltr:before:mr-2 rtl:before:ml-2 dark:text-[#888ea8] dark:hover:bg-gray-900"
                                                    onClick={() => handleToggleMenuSub('error_list')}
                                                >
                                                    Error
                                                    <div className="ltr:ml-auto rtl:mr-auto rtl:rotate-180">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path
                                                                opacity="0.5"
                                                                d="M6.25 19C6.25 19.3139 6.44543 19.5946 6.73979 19.7035C7.03415 19.8123 7.36519 19.7264 7.56944 19.4881L13.5694 12.4881C13.8102 12.2073 13.8102 11.7928 13.5694 11.5119L7.56944 4.51194C7.36519 4.27364 7.03415 4.18773 6.73979 4.29662C6.44543 4.40551 6.25 4.68618 6.25 5.00004L6.25 19Z"
                                                                fill="currentColor"
                                                            />
                                                            <path
                                                                fill-rule="evenodd"
                                                                clip-rule="evenodd"
                                                                d="M10.5119 19.5695C10.1974 19.2999 10.161 18.8264 10.4306 18.5119L16.0122 12L10.4306 5.48811C10.161 5.17361 10.1974 4.70014 10.5119 4.43057C10.8264 4.161 11.2999 4.19743 11.5695 4.51192L17.5695 11.5119C17.8102 11.7928 17.8102 12.2072 17.5695 12.4881L11.5695 19.4881C11.2999 19.8026 10.8264 19.839 10.5119 19.5695Z"
                                                                fill="currentColor"
                                                            />
                                                        </svg>
                                                    </div>
                                                </button>
                                                <ul className={`sub-menu text-gray-500 ltr:ml-2 rtl:mr-2 collapsible ${activeDropdownSub == 'error_list' ? 'expanded' : ''}`}>
                                                    <li>
                                                        <a href="pages-error404.html" target="_blank">404</a>
                                                    </li>
                                                </ul>
                                            </li>
                                        </ul>
                                    
                                    </li>
                                </ul>
                            </li> */}

                        {/* End I comment this blog for example use later on */}
                        {(
                            hasPermission('Category-View') ||
                            hasPermission('Brand-View') ||
                            hasPermission('Payment-Method-View') ||
                            hasPermission('Unit-View') ||
                            hasPermission('Varient-Attribute-View') ||
                            hasPermission('Product-View') ||
                            hasPermission('Service-View')
                        ) && (
                            <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <svg
                                    className="hidden h-5 w-4 flex-none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>Inventory</span>
                            </h2>
                        )}

                        {hasPermission('Category-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink to="/categories" className={({ isActive }) => `${defaultClass} ${isActive ? 'active' : ''}`.trim()}>
                                            <div className="flex items-center">
                                                <LayoutList />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Categories</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Brand-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink to="/brands" className={({ isActive }) => `${defaultClass} ${isActive ? 'active' : ''}`.trim()}>
                                            <div className="flex items-center">
                                                <Tags />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Brands</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Payment-Method-View') && 
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink to="/paymentmethod" className={({ isActive }) => `${defaultClass} ${isActive ? 'active' : ''}`.trim()}>
                                            <div className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
                                                    <g fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path strokeLinecap="round" d="M15 5H9c-2.809 0-4.213 0-5.222.674a4 4 0 0 0-1.104 1.104C2 7.787 2 9.19 2 12s0 4.213.674 5.222a4 4 0 0 0 1.104 1.104c.347.232.74.384 1.222.484M9 19h6c2.809 0 4.213 0 5.222-.674a4 4 0 0 0 1.104-1.104C22 16.213 22 14.81 22 12s0-4.213-.674-5.222a4 4 0 0 0-1.104-1.104c-.347-.232-.74-.384-1.222-.484"></path>
                                                        <path d="M9 9a3 3 0 1 0 0 6m6-6a3 3 0 1 1 0 6"></path><path strokeLinecap="round" d="M9 5v14m6-14v14"></path>
                                                    </g>
                                                </svg>
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Payment Method</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Unit-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink to="/units" className={({ isActive }) => `${defaultClass} ${isActive ? 'active' : ''}`.trim()}>
                                            <div className="flex items-center">
                                                <Boxes />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Units</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Varient-Attribute-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink to="/varientattributes" className={`${['varientattributes'].includes(segments[0]) ? 'active' : ''}`}>
                                            <div className="flex items-center">
                                                <ChartColumnStacked />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Varient Attributes</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Product-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/products"
                                            className={location.pathname.includes('/products') || location.pathname.includes('/productvariant') ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <AlignEndHorizontal />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Products</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Service-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/services"
                                            className={location.pathname.includes('/services') ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <HeartHandshake />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Services</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {(
                            hasPermission('Purchase-View') ||
                            hasPermission('Quotation-View') || 
                            hasPermission('Sale-View') ||
                            hasPermission('Sale-Return')
                        ) && (
                            <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <svg
                                    className="hidden h-5 w-4 flex-none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>Sale</span>
                            </h2>
                        )}

                        {hasPermission('Purchase-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/purchase"
                                            className={['purchase','addpurchase','editpurchase'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <ShoppingCart />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Purchases</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Quotation-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/quotation"
                                            className={['quotation','addquotation','editquotation'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <TextQuote />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Quotations</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Sale-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/sale"
                                            className={['sale','addsale','editsale'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <FilePenLine />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Sales</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Sale-Return') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/returnsells"
                                            className={['returnsells','printsell-return'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <Undo2 />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Return Sales</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {(
                            hasPermission('Adjust-Stock-View') ||
                            hasPermission('Stock-Transfer-View') ||
                            hasPermission('Stock-Request-View') ||
                            hasPermission('Stock-Return-View')
                        ) && (
                            <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <svg
                                    className="hidden h-5 w-4 flex-none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>Stock</span>
                            </h2>
                        )}

                        {hasPermission('Adjust-Stock-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/adjuststock"
                                            className={['adjuststock','addadjuststock','editadjuststock'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <Layers2 />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Stock Adjustment</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Stock-Transfer-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/movestock"
                                            className={['movestock','addmovestock','editmovestock'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <FolderSync />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Stock Transfer</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Stock-Request-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/stockrequest"
                                            className={['stockrequest','addrequeststock','editrequeststock'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <HandHelping />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Stock Request</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Stock-Return-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/stockreturn"
                                            className={['stockreturn','addreturnstock','editreturnstock'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <HandCoins />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Stock Return</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {(
                            hasPermission('Expense-View') ||
                            hasPermission('Income-View')
                        ) && (
                            <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <svg
                                    className="hidden h-5 w-4 flex-none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>Expense / Income</span>
                            </h2>
                        )}

                        {hasPermission('Expense-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/expense"
                                            className={['expense','addexpense','editexpense'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <BanknoteArrowDown />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Expenses</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Income-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/income"
                                            className={['income','addincome','editincome'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <BanknoteArrowUp />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Incomes</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {(
                            hasPermission('Sale-Report') ||
                            hasPermission('Cancel-Sale') ||
                            hasPermission('Sale-Return-Report') ||
                            hasPermission('Payment-Sale-Report') ||
                            hasPermission('Purchase-Report') ||
                            hasPermission('Payment-Purchase-Report') ||
                            hasPermission('Quotation-Report') ||
                            hasPermission('Stock-Summary-Report') ||
                            hasPermission('Stock-Low-Report') ||
                            hasPermission('Stock-Movement-Report') ||
                            hasPermission('Stock-Valuation-Report') ||
                            hasPermission('Profit-Report') ||
                            hasPermission('Adjustment-Report') ||
                            hasPermission('Request-Report') ||
                            hasPermission('Return-Report') ||
                            hasPermission('Transfer-Report') ||
                            hasPermission('Expense-Report') ||
                            hasPermission('Income-Report') ||
                            hasPermission('Cash-Session-View') ||
                            hasPermission('Cash-Session-Report') ||
                            hasPermission('Top-Selling-Products-Report') ||
                            hasPermission('Top-Sales-Person-Report')
                        ) && (
                            <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <svg
                                    className="hidden h-5 w-4 flex-none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>Report</span>
                            </h2>
                        )}

                        {hasPermission('Sale-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportInvoice"
                                            className={['reportInvoice'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <FilePenLine />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Sale Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Cancel-Sale') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportCancelInvoice"
                                            className={['reportCancelInvoice'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <CircleOff />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Cancel Sale Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Sale-Return-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportSaleReturn"
                                            className={['reportSaleReturn'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <FilePenLine />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Sale Return Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Payment-Sale-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportPayment"
                                            className={['reportPayment'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <CircleDollarSign />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Payment Sale Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Quotation-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportQuotation"
                                            className={['reportQuotation'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <TextQuote />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Quotation Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Purchase-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportPurchase"
                                            className={['reportPurchase'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <ShoppingCart />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Purchase Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Payment-Purchase-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportPurPayment"
                                            className={['reportPurchasePayment'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <CircleDollarSign />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Payment Purchase Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Profit-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/profitreport"
                                            className={['profitreport'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <Wallet />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Profit Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Stock-Summary-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/stocksummary"
                                            className={['stocksummary'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <Layers />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Stock Summary Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Stock-Low-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/low-stock"
                                            className={['low-stock'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <ArrowDownNarrowWide />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Stock Low Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Stock-Movement-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/stock-movements"
                                            className={['stock-movements'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <Activity />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Stock Movement Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Stock-Valuation-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/stock-valuations"
                                            className={['stock-valuations'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <ChartCandlestick />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Stock Valuation Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Stock-Summary-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/asset-report"
                                            className={['asset-report'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <ScanBarcode />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Serial / Asset Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Adjustment-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportAdjustment"
                                            className={['reportAdjustment'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <Layers2 />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Adjustment Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Transfer-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportTransfer"
                                            className={['reportTransfer'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <FolderSync />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Transfer Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Request-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportRequest"
                                            className={['reportRequest'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <HandHelping />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Request Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Return-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportReturn"
                                            className={['reportReturn'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <HandCoins />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Return Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Customer-Equipment-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportCustomerEquipment"
                                            className={['reportCustomerEquipment'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <MonitorSmartphone />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Equipment Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Expense-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportExpense"
                                            className={['reportExpense'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <BanknoteArrowDown />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Expense Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Income-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportIncome"
                                            className={['reportIncome'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <BanknoteArrowUp />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Income Report</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Top-Selling-Products-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportTopSellingProducts"
                                            className={location.pathname.includes('reportTopSellingProducts') ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <TrendingUp />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Top Selling Products</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Top-Sales-Person-Report') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/reportTopSalesPerson"
                                            className={location.pathname.includes('reportTopSalesPerson') ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <UserCheck />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Top Sales Person</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {(hasPermission('Cash-Session-View') || hasPermission('Cash-Session-Report')) &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/cashsession"
                                            className={location.pathname.includes('cashsession') ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <Landmark />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Cash Sessions</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {(
                            hasPermission('Amount-Purchase-View') ||
                            hasPermission('Exchange-Rate-View') ||
                            hasPermission('Company-Settings-View') ||
                            hasPermission('POS-View')
                        ) && (
                            <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <svg
                                    className="hidden h-5 w-4 flex-none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>Setting</span>
                            </h2>
                        )}

                        {hasPermission('Amount-Purchase-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/authorizeamount"
                                            className={['authorizeamount'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <FileKey />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">PO Authorize Amount</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Exchange-Rate-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/exchangerate"
                                            className={['exchangerate'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <BadgeDollarSign />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Exchange Rates</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('Company-Settings-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/companysettings"
                                            className={['companysettings'].some(seg => location.pathname.includes(seg)) ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Company Settings</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }

                        {hasPermission('POS-View') &&
                            <li className="nav-item">
                                <ul>
                                    <li className="nav-item" onClick={() => handleToggleMenu(null)}>
                                        <NavLink
                                            to="/pos"
                                            className={location.pathname === '/pos' ? 'active' : ''}
                                        >
                                            <div className="flex items-center">
                                                <Store />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Point of Sale</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </ul>
                            </li>
                        }
                    </ul>
                </div>
            </nav>
        </div>
    )
}

export default Sidebar;