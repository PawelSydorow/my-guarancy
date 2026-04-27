import { NextResponse } from 'next/server'

function blockedResponse() {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}

export async function GET() {
  return blockedResponse()
}

export async function POST() {
  return blockedResponse()
}

export async function PUT() {
  return blockedResponse()
}

export async function PATCH() {
  return blockedResponse()
}

export async function DELETE() {
  return blockedResponse()
}
