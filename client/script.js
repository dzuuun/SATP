"use strict";

function getAuthorizedHome(user) {
    if ([1, 2].includes(Number(user.is_student_rater))) return "/rating/";
    if (Number(user.transaction_access) === 1) return "/transaction/";
    if (Number(user.reports_access) === 1) return "/report/ranking/";
    if (Number(user.maintenance_access) === 1) return "/maintenance/admin/";
    if (Number(user.users_access) === 1) return "/user/activity_log/";
    return null;
}

async function redirectAuthenticatedUser() {
    try {
        const result = await fetch("/api/login/session", {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
        });
        if (!result.ok) return;

        const response = await result.json();
        const user = response.data;
        const destination = user && getAuthorizedHome(user);
        if (!destination) return;

        const storageData = {
            user_id: user.id,
            username: user.username,
            permission_id: user.permission_id,
            permission_name: user.permission_name,
            is_student_rater: user.is_student_rater,
            adminAcademicScope: user.admin_academic_scope,
            transactionAccess: user.transaction_access,
            maintenanceAccess: user.maintenance_access,
            reportsAccess: user.reports_access,
            usersAccess: user.users_access,
        };
        Object.entries(storageData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                localStorage.setItem(key, value);
            }
        });

        window.location.replace(destination);
    } catch (_error) {
        // Keep the public landing page available when session validation fails.
    }
}

redirectAuthenticatedUser();

const year = document.querySelector("#year");

if (year) {
    year.textContent = new Date().getFullYear();
}
