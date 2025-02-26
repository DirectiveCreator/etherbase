"use client"

import React from "react"
import SchemaPanel from "../../components/SchemaPanel"
import PermissionsPanel from "@/components/PermissionsPanel"
import StatePanel from "../../components/StatePanel"

// shadcn/ui components
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Address } from "viem"

interface EventDefinition {
  name: string
  args?: { name: string; argType: string }[]
}

interface SourceDetailsProps {
  address: Address
  initialEventDefinitions: EventDefinition[]
}

export default function SourceDetails({
  address,
  initialEventDefinitions,
}: SourceDetailsProps) {
  const router = useRouter()

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Source: {address}
        </h2>
        <Button
          onClick={() => router.push("/sources")}
          variant="outline"
          size="sm"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Sources
        </Button>
      </div>

      <Tabs defaultValue="schema" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="state">State</TabsTrigger>
        </TabsList>

        {/* SCHEMA TAB */}
        <TabsContent value="schema">
          <SchemaPanel
            sourceAddress={address}
            initialEventDefinitions={initialEventDefinitions}
          />
        </TabsContent>

        {/* PERMISSIONS TAB */}
        <TabsContent value="permissions">
          <PermissionsPanel sourceAddress={address} />
        </TabsContent>

        {/* STATE TAB */}
        <TabsContent value="state">
          <StatePanel sourceAddress={address} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
