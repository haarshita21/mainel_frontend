"use client";

import Link from "next/link";
import { useState } from "react";

const initialNotifications = [
  {
    id: 1,
    type: "nearby-task",
    title: "New cleanup task nearby",
    description:
      "A verified mixed-waste cleanup task has been reported in Indiranagar.",
    location: "Indiranagar · 0.8 km away",
    time: "2 min ago",
    unread: true,
  },
  {
    id: 2,
    type: "task-update",
    title: "Cleanup task needs volunteers",
    description:
      "A plastic-waste cleanup task in Koramangala still needs 2 volunteers.",
    location: "Koramangala · 1.4 km away",
    time: "18 min ago",
    unread: true,
  },
];

export default function VolunteerNotifications() {
  const [notifications, setNotifications] =
    useState(initialNotifications);

  const unreadCount = notifications.filter(
    (notification) => notification.unread
  ).length;

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        unread: false,
      }))
    );
  };

  const markAsRead = (id: number) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, unread: false }
          : notification
      )
    );
  };

  return (
    <main className="min-h-screen bg-[#06110D] text-[#F4FFF8]">
      {/* NAVBAR */}
      <nav className="mx-auto flex h-[88px] max-w-[1200px] items-center justify-between px-6">
        <Link
          href="/volunteer"
          className="text-[22px] font-semibold tracking-[-0.04em]"
        >
          Urban<span className="text-[#19D879]">Triage</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/volunteer"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Dashboard
          </Link>

          <Link
            href="/volunteer/tasks"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            Tasks
          </Link>

          <Link
            href="/map"
            className="rounded-xl px-4 py-2.5 text-sm text-[#91A99C] transition-colors hover:text-[#F4FFF8]"
          >
            City Map
          </Link>

          <div className="ml-2 flex h-10 w-10 items-center justify-center rounded-xl border border-[#19D879]/25 bg-[#19D879]/10 text-sm text-[#19D879]">
            🔔
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <section className="mx-auto max-w-[900px] px-6 pb-24 pt-12">
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#19D879]">
              VOLUNTEER NETWORK
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] md:text-5xl">
              Notifications
            </h1>

            <p className="mt-4 max-w-[600px] text-sm leading-7 text-[#91A99C]">
              Stay updated when cleanup opportunities and task
              changes happen near you.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="w-fit rounded-xl border border-white/[0.10] bg-white/[0.035] px-4 py-2.5 text-xs text-[#91A99C] transition-all hover:border-[#19D879]/25 hover:text-[#F4FFF8]"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* RADIUS STATUS */}
        <div className="mt-10 flex items-center justify-between rounded-2xl border border-[#19D879]/15 bg-[#0B2118]/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#19D879]" />

            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#91A99C]">
                Nearby task alerts
              </p>

              <p className="mt-1 text-sm font-medium text-[#F4FFF8]">
                Active within 2 km
              </p>
            </div>
          </div>

          <span className="rounded-full bg-[#19D879]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#19D879]">
            ON
          </span>
        </div>

        {/* NOTIFICATIONS */}
        <div className="mt-6 space-y-3">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => markAsRead(notification.id)}
              className={`w-full rounded-[24px] border p-6 text-left transition-all duration-200 hover:border-[#19D879]/25 ${
                notification.unread
                  ? "border-[#19D879]/15 bg-[#0B2118]/50"
                  : "border-white/[0.07] bg-white/[0.02]"
              }`}
            >
              <div className="flex gap-4">
                {/* ICON */}
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    notification.unread
                      ? "bg-[#19D879]/10 text-[#19D879]"
                      : "bg-white/[0.05] text-[#91A99C]"
                  }`}
                >
                  {notification.type === "nearby-task"
                    ? "📍"
                    : "♻"}
                </div>

                {/* CONTENT */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-[#F4FFF8]">
                        {notification.title}
                      </h2>

                      {notification.unread && (
                        <span className="h-2 w-2 rounded-full bg-[#19D879]" />
                      )}
                    </div>

                    <span className="text-[10px] text-[#91A99C]">
                      {notification.time}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-[#91A99C]">
                    {notification.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-[#19D879]">
                      {notification.location}
                    </span>

                    <Link
                      href="/volunteer/tasks"
                      onClick={(event) => event.stopPropagation()}
                      className="text-xs font-medium text-[#F4FFF8] transition-colors hover:text-[#19D879]"
                    >
                      View tasks →
                    </Link>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* EMPTY STATE */}
        {notifications.length === 0 && (
          <div className="mt-8 rounded-[28px] border border-white/[0.08] bg-white/[0.02] px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05]">
              🔕
            </div>

            <h2 className="mt-5 text-lg font-semibold">
              You're all caught up
            </h2>

            <p className="mx-auto mt-2 max-w-[400px] text-sm leading-6 text-[#91A99C]">
              New verified cleanup tasks within your notification
              radius will appear here.
            </p>
          </div>
        )}

        {/* INFO */}
        <div className="mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <p className="text-xs leading-6 text-[#91A99C]">
            In the live system, notifications will be generated
            when a verified cleanup task is created within the
            volunteer's configured radius. Location and task
            proximity will come from the system.
          </p>
        </div>
      </section>
    </main>
  );
}