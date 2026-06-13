import { redirect } from 'next/navigation';

export default function AdminSeedRedirectPage() {
  redirect('/admin/content/add?tab=product&view=add');
}
