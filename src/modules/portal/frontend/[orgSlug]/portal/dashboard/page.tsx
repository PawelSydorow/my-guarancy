import { redirect } from 'next/navigation'

type Props = {
  params: { orgSlug: string }
}

export default function PortalDashboardPage({ params }: Props) {
  redirect(`/${params.orgSlug}/portal/warranty-claims`)
}
