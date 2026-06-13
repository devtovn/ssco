import { redirect } from 'next/navigation';

export default function AdminProductsRedirectPage() {
  redirect('/admin/content/add?tab=product&view=list');
}
