

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "analytics";


ALTER SCHEMA "analytics" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "analytics"."housekeeping"() RETURNS "void"
    LANGUAGE "sql"
    AS $$
  delete from analytics.events           where ts < now() - interval '24 months';
  delete from analytics.visitor_salts    where day < current_date - 2;
  delete from analytics.identified_users where last_seen < now() - interval '90 days';
  delete from analytics.ingest_log       where ts < now() - interval '30 days';
  delete from analytics.events e
    using public.websites w
    where e.site_id = w.id and w.deleted_at is not null
      and e.id in (select id from analytics.events where site_id = w.id limit 50000);
  delete from public.websites w
    where w.deleted_at is not null
      and not exists (select 1 from analytics.events where site_id = w.id);
$$;


ALTER FUNCTION "analytics"."housekeeping"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_period_summary"("p_website_url" "text", "p_from" timestamp with time zone, "p_to" timestamp with time zone) RETURNS TABLE("views_count" bigint, "visitors_count" bigint, "average_session_duration" numeric, "bounce_rate" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  with period_views as (
    select count(*) as views
    from public.page_views
    where website_url = p_website_url
      and created_at >= p_from
      and created_at <= p_to
  ),
  period_sessions as (
    select client_id, session_duration
    from public.sessions
    where website_url = p_website_url
      and created_at >= p_from
      and created_at <= p_to
  )
  select
    (select views from period_views)::bigint as views_count,
    (select count(distinct client_id) from period_sessions)::bigint
      as visitors_count,
    -- Mirrors calculateAverageSessionDuration in lib/utils.ts: milliseconds
    -- converted to minutes, rounded to 2dp
    coalesce(
      round(
        (avg(coalesce(session_duration, 0)) / 60000.0)::numeric, 2
      ), 0
    ) as average_session_duration,
    -- Mirrors calculateBounceRate in lib/utils.ts: a bounce is a session
    -- shorter than 10 seconds. Keep this threshold in sync with the JS.
    coalesce(
      round(
        (count(*) filter (where session_duration < 10000)::numeric
          / nullif(count(*), 0)::numeric) * 100, 2
      ), 0
    ) as bounce_rate
  from period_sessions;
$$;


ALTER FUNCTION "public"."get_period_summary"("p_website_url" "text", "p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "analytics"."events" (
    "id" bigint NOT NULL,
    "site_id" bigint NOT NULL,
    "ts" timestamp with time zone NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "seq" integer DEFAULT 0 NOT NULL,
    "event" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "visitor_id" bigint NOT NULL,
    "session_id" bigint NOT NULL,
    "user_hash" bigint DEFAULT 0 NOT NULL,
    "pageview_id" bigint NOT NULL,
    "hostname" "text" NOT NULL,
    "path" "text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "query" "text" DEFAULT ''::"text" NOT NULL,
    "referrer" "text" DEFAULT ''::"text" NOT NULL,
    "referrer_url" "text" DEFAULT ''::"text" NOT NULL,
    "source" "text" DEFAULT ''::"text" NOT NULL,
    "channel" "text" DEFAULT ''::"text" NOT NULL,
    "utm_source" "text" DEFAULT ''::"text" NOT NULL,
    "utm_medium" "text" DEFAULT ''::"text" NOT NULL,
    "utm_campaign" "text" DEFAULT ''::"text" NOT NULL,
    "utm_term" "text" DEFAULT ''::"text" NOT NULL,
    "utm_content" "text" DEFAULT ''::"text" NOT NULL,
    "country" "text" DEFAULT ''::"text" NOT NULL,
    "region" "text" DEFAULT ''::"text" NOT NULL,
    "city" "text" DEFAULT ''::"text" NOT NULL,
    "device" "text" DEFAULT ''::"text" NOT NULL,
    "browser" "text" DEFAULT ''::"text" NOT NULL,
    "browser_major" smallint DEFAULT 0 NOT NULL,
    "browser_version" "text" DEFAULT ''::"text" NOT NULL,
    "os" "text" DEFAULT ''::"text" NOT NULL,
    "os_version" "text" DEFAULT ''::"text" NOT NULL,
    "screen_width" smallint DEFAULT 0 NOT NULL,
    "screen_height" smallint DEFAULT 0 NOT NULL,
    "language" "text" DEFAULT ''::"text" NOT NULL,
    "engaged_ms" integer DEFAULT 0 NOT NULL,
    "scroll_depth" smallint DEFAULT 0 NOT NULL,
    "props" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "revenue" numeric,
    "lcp" real,
    "cls" real,
    "inp" real,
    "fcp" real,
    "ttfb" real,
    "dcl" real,
    "load" real,
    "tti" real,
    "tbt" real,
    "resources" smallint,
    "lcp_target" "text",
    "inp_target" "text",
    "suspect" boolean DEFAULT false NOT NULL,
    "ingest_version" smallint NOT NULL,
    CONSTRAINT "events_event_check" CHECK (("event" = ANY (ARRAY['pageview'::"text", 'engagement'::"text", 'custom'::"text", 'vitals'::"text", 'identify'::"text"])))
);


ALTER TABLE "analytics"."events" OWNER TO "postgres";


ALTER TABLE "analytics"."events" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "analytics"."events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "analytics"."identified_users" (
    "site_id" bigint NOT NULL,
    "user_hash" bigint NOT NULL,
    "user_id" "text" NOT NULL,
    "last_seen" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "analytics"."identified_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."ingest_log" (
    "ts" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hostname" "text" NOT NULL,
    "site_id" bigint,
    "stage" "text" NOT NULL,
    "detail" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "analytics"."ingest_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."site_hostnames" (
    "site_id" bigint NOT NULL,
    "hostname" "text" NOT NULL
);


ALTER TABLE "analytics"."site_hostnames" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."site_settings" (
    "site_id" bigint NOT NULL,
    "timezone" "text" DEFAULT 'UTC'::"text" NOT NULL,
    "store_titles" boolean DEFAULT false NOT NULL,
    "store_user_ids" boolean DEFAULT false NOT NULL,
    "excluded_ips" "cidr"[] DEFAULT '{}'::"cidr"[] NOT NULL,
    "excluded_paths" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);


ALTER TABLE "analytics"."site_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."visitor_salts" (
    "day" "date" NOT NULL,
    "salt" "bytea" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "analytics"."visitor_salts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_events" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_name" "text" NOT NULL,
    "property_name" "text",
    "property_value" "text",
    "website_url" "text" NOT NULL,
    "session_id" "text" NOT NULL,
    "page_url" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "event_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."custom_events" OWNER TO "postgres";


ALTER TABLE "public"."custom_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."custom_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."page_views" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "website_url" "text" NOT NULL,
    "page" "text" NOT NULL,
    "session_id" "text" NOT NULL,
    "pathname" "text" NOT NULL,
    "referrer" "text" DEFAULT 'Unknown'::"text" NOT NULL
);


ALTER TABLE "public"."page_views" OWNER TO "postgres";


ALTER TABLE "public"."page_views" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."page_views_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."visitors" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_id" "text" NOT NULL,
    "website_url" "text" NOT NULL,
    "last_visited" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL
);


ALTER TABLE "public"."visitors" OWNER TO "postgres";


ALTER TABLE "public"."visitors" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."session_clients_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "text" NOT NULL,
    "session_duration" numeric DEFAULT '0'::numeric,
    "website_url" "text" NOT NULL,
    "country" "text" DEFAULT 'Unknown'::"text" NOT NULL,
    "client_id" "text" NOT NULL,
    "device" "text" DEFAULT 'Unknown'::"text" NOT NULL,
    "operating_system" "text" DEFAULT 'Unknown'::"text" NOT NULL,
    "browser" "text" DEFAULT 'Unknown'::"text" NOT NULL,
    "city" "text" DEFAULT 'Unknown'::"text" NOT NULL
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


ALTER TABLE "public"."sessions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sessions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."vitals" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "website_url" "text",
    "session_id" "text",
    "lcp" numeric,
    "cls" numeric,
    "inp" numeric,
    "fcp" numeric,
    "ttfb" numeric,
    "tbt" numeric,
    "load" numeric,
    "tti" numeric,
    "interaction_count" bigint,
    "resource_count" bigint,
    "total_js_heap" bigint,
    "used_js_heap" bigint,
    "dcl" numeric
);


ALTER TABLE "public"."vitals" OWNER TO "postgres";


ALTER TABLE "public"."vitals" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."vitals_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."websites" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_first_visit" boolean DEFAULT true NOT NULL,
    "slug" "text" NOT NULL,
    "visitors" numeric DEFAULT '0'::numeric NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."websites" OWNER TO "postgres";


ALTER TABLE "public"."websites" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."websites_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "analytics"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."identified_users"
    ADD CONSTRAINT "identified_users_pkey" PRIMARY KEY ("site_id", "user_hash");



ALTER TABLE ONLY "analytics"."site_hostnames"
    ADD CONSTRAINT "site_hostnames_hostname_key" UNIQUE ("hostname");



ALTER TABLE ONLY "analytics"."site_hostnames"
    ADD CONSTRAINT "site_hostnames_pkey" PRIMARY KEY ("site_id", "hostname");



ALTER TABLE ONLY "analytics"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("site_id");



ALTER TABLE ONLY "analytics"."visitor_salts"
    ADD CONSTRAINT "visitor_salts_pkey" PRIMARY KEY ("day");



ALTER TABLE ONLY "public"."custom_events"
    ADD CONSTRAINT "custom_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_views"
    ADD CONSTRAINT "page_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visitors"
    ADD CONSTRAINT "session_clients_client_id_key" UNIQUE ("client_id");



ALTER TABLE ONLY "public"."visitors"
    ADD CONSTRAINT "session_clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."vitals"
    ADD CONSTRAINT "vitals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_url_key" UNIQUE ("url");



CREATE INDEX "events_custom_name" ON "analytics"."events" USING "btree" ("site_id", "name", "ts") WHERE ("event" = 'custom'::"text");



CREATE INDEX "events_site_session" ON "analytics"."events" USING "btree" ("site_id", "visitor_id", "session_id");



CREATE INDEX "events_site_ts" ON "analytics"."events" USING "btree" ("site_id", "ts");



CREATE INDEX "ingest_log_hostname_ts" ON "analytics"."ingest_log" USING "btree" ("hostname", "ts");



CREATE INDEX "custom_events_site_time_idx" ON "public"."custom_events" USING "btree" ("website_url", "created_at");



CREATE INDEX "page_views_site_time_idx" ON "public"."page_views" USING "btree" ("website_url", "created_at");



CREATE INDEX "sessions_site_time_idx" ON "public"."sessions" USING "btree" ("website_url", "created_at");



CREATE INDEX "visitors_site_last_visited_idx" ON "public"."visitors" USING "btree" ("website_url", "last_visited");



CREATE INDEX "vitals_site_time_idx" ON "public"."vitals" USING "btree" ("website_url", "created_at");



ALTER TABLE ONLY "analytics"."events"
    ADD CONSTRAINT "events_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."websites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "analytics"."identified_users"
    ADD CONSTRAINT "identified_users_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."websites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "analytics"."site_hostnames"
    ADD CONSTRAINT "site_hostnames_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."websites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "analytics"."site_settings"
    ADD CONSTRAINT "site_settings_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."websites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_events"
    ADD CONSTRAINT "custom_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("session_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_events"
    ADD CONSTRAINT "custom_events_website_url_fkey" FOREIGN KEY ("website_url") REFERENCES "public"."websites"("url") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."page_views"
    ADD CONSTRAINT "page_views_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("session_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."page_views"
    ADD CONSTRAINT "page_views_website_url_fkey" FOREIGN KEY ("website_url") REFERENCES "public"."websites"("url") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."visitors"("client_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_websire_url_fkey" FOREIGN KEY ("website_url") REFERENCES "public"."websites"("url") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."visitors"
    ADD CONSTRAINT "visitors_website_url_fkey" FOREIGN KEY ("website_url") REFERENCES "public"."websites"("url") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vitals"
    ADD CONSTRAINT "vitals_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("session_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vitals"
    ADD CONSTRAINT "vitals_website_url_fkey" FOREIGN KEY ("website_url") REFERENCES "public"."websites"("url") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE "public"."custom_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "custom_events: owner select" ON "public"."custom_events" FOR SELECT TO "authenticated" USING (("website_url" IN ( SELECT "websites"."url"
   FROM "public"."websites"
  WHERE ("websites"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."page_views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "page_views: owner select" ON "public"."page_views" FOR SELECT TO "authenticated" USING (("website_url" IN ( SELECT "websites"."url"
   FROM "public"."websites"
  WHERE ("websites"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sessions: owner select" ON "public"."sessions" FOR SELECT TO "authenticated" USING (("website_url" IN ( SELECT "websites"."url"
   FROM "public"."websites"
  WHERE ("websites"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."visitors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "visitors: owner select" ON "public"."visitors" FOR SELECT TO "authenticated" USING (("website_url" IN ( SELECT "websites"."url"
   FROM "public"."websites"
  WHERE ("websites"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."vitals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vitals: owner select" ON "public"."vitals" FOR SELECT TO "authenticated" USING (("website_url" IN ( SELECT "websites"."url"
   FROM "public"."websites"
  WHERE ("websites"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."websites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "websites: owner delete" ON "public"."websites" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "websites: owner insert" ON "public"."websites" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "websites: owner select" ON "public"."websites" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "websites: owner update" ON "public"."websites" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



GRANT USAGE ON SCHEMA "analytics" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_period_summary"("p_website_url" "text", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_period_summary"("p_website_url" "text", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "service_role";



GRANT ALL ON TABLE "analytics"."events" TO "service_role";



GRANT ALL ON SEQUENCE "analytics"."events_id_seq" TO "service_role";



GRANT ALL ON TABLE "analytics"."identified_users" TO "service_role";



GRANT ALL ON TABLE "analytics"."ingest_log" TO "service_role";



GRANT ALL ON TABLE "analytics"."site_hostnames" TO "service_role";



GRANT ALL ON TABLE "analytics"."site_settings" TO "service_role";



GRANT ALL ON TABLE "analytics"."visitor_salts" TO "service_role";



GRANT ALL ON TABLE "public"."custom_events" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."custom_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."custom_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."page_views" TO "authenticated";
GRANT ALL ON TABLE "public"."page_views" TO "service_role";



GRANT ALL ON SEQUENCE "public"."page_views_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."page_views_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."visitors" TO "authenticated";
GRANT ALL ON TABLE "public"."visitors" TO "service_role";



GRANT ALL ON SEQUENCE "public"."session_clients_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."session_clients_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sessions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sessions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vitals" TO "authenticated";
GRANT ALL ON TABLE "public"."vitals" TO "service_role";



GRANT ALL ON SEQUENCE "public"."vitals_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."vitals_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."websites" TO "authenticated";
GRANT ALL ON TABLE "public"."websites" TO "service_role";



GRANT ALL ON SEQUENCE "public"."websites_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."websites_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "analytics" GRANT ALL ON SEQUENCES  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "analytics" GRANT ALL ON TABLES  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






