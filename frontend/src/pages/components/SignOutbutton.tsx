import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as apiClient from "../../api/auth";
import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const SignOutButton: React.FC = () => {
    const  queryClient = useQueryClient();

    const navigate = useNavigate();
    
    const mutation = useMutation({
        mutationFn: apiClient.signOut, // ✅ Use `mutationFn`
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ["validateToken"] }); // ✅ Wrap queryKey in array
          localStorage.clear();
          navigate("/");
        },
        onError: (errors: Error) => {
          toast.error(errors.message, {
            position: "top-right",
            autoClose: 2000,
          });
        },
    });
      
    const handleClick = () => {
        mutation.mutate();
    };

    return (
        <button onClick={handleClick} className="!py-3 text-danger">
            <svg
                className="h-4.5 w-4.5 shrink-0 rotate-90 ltr:mr-2 rtl:ml-2"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    opacity="0.5"
                    d="M17 9.00195C19.175 9.01406 20.3529 9.11051 21.1213 9.8789C22 10.7576 22 12.1718 22 15.0002V16.0002C22 18.8286 22 20.2429 21.1213 21.1215C20.2426 22.0002 18.8284 22.0002 16 22.0002H8C5.17157 22.0002 3.75736 22.0002 2.87868 21.1215C2 20.2429 2 18.8286 2 16.0002L2 15.0002C2 12.1718 2 10.7576 2.87868 9.87889C3.64706 9.11051 4.82497 9.01406 7 9.00195"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
                <path
                    d="M12 15L12 2M12 2L15 5.5M12 2L9 5.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            Sign Out
        </button>
    );
};

export default SignOutButton;