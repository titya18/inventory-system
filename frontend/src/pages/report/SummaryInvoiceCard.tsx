import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import CountUp from "react-countup";

type Props = {
    title: string;
    value: number;
    icon: any;
    color: string; // color name or hex
    isCurrency?: boolean;
    onClick?: () => void;
};

export default function SummaryCard({
    title,
    value,
    icon,
    color,
    isCurrency = false,
    onClick,
}: Props) {
    // Icon container style
    const iconStyle: React.CSSProperties = {
        backgroundColor: color + "33", // light background, e.g., "#00ff0033"
        color: color, // icon color
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
    };

    // Card style
    const cardStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        padding: "16px",
        backgroundColor: "#fff",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s",
        margin: "8px",
    };

    const textStyle: React.CSSProperties = {
        marginLeft: "12px",
        display: "flex",
        flexDirection: "column",
    };

    const titleStyle: React.CSSProperties = {
        fontSize: "12px",
        color: "#666",
        marginBottom: "4px",
    };

    const valueStyle: React.CSSProperties = {
        fontSize: "18px",
        fontWeight: "bold",
        color: color,
    };

    return (
        <div style={cardStyle} onClick={onClick}>
            <div style={iconStyle}>
                <FontAwesomeIcon icon={icon} />
            </div>

            <div style={textStyle}>
                <span style={titleStyle}>{title}</span>
                <span style={valueStyle}>
                    {isCurrency && "$"}
                    <CountUp
                        end={value || 0}
                        duration={1.2}
                        separator=","
                        decimals={isCurrency ? 2 : 0}
                    />
                </span>
            </div>
        </div>
    );
}
