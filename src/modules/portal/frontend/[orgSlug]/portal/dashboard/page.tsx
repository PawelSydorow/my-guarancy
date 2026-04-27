import { redirect } from 'next/navigation'

type Props = {
  params: { orgSlug: string }
}

export default function PortalDashboardPage({ params }: Props): never {
  redirect(`/${params.orgSlug}/portal/warranty-claims`)
}
