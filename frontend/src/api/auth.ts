import { SignUpFormData } from "../pages/signup/SignUp";
import { signInFormData } from "../pages/signin/SignIn";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const signIn = async (formData: signInFormData) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/signIn`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
    });
    const responseBody = await response.json();
    if (!response.ok) {
        throw new Error(responseBody.message);
    }
    return responseBody; // ✅ Return response data
};

export const signUp = async (formData: SignUpFormData) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/signUpUser`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
    });
    const responseBody = await response.json();
    if (!response.ok) {
        throw new Error(responseBody.message);
    }
    return responseBody;
};

export const validateToken = async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/validateToken`, {
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Token invalid");
    }
    return response.json();
};

export const signOut = async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/signOut`, {
        method: "POST",
        credentials: "include"
    });
    if (!response.ok) {
        throw new Error("Error during sign out");
    }
}