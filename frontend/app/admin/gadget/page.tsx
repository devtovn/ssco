import { redirect } from 'next/navigation';

type Props = { searchParams: { view?: string } };

export default function AdminGadgetRedirectPage({ searchParams }: Props) {
  const view = searchParams.view === 'list' ? 'list' : 'add';
  redirect(`/admin/content/add?tab=gadget&view=${view}`);
}
