import { redirect } from 'next/navigation';

export default function dashboardRedirect() {
    redirect("/customer/dashboard");
}