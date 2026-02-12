
ALTER TABLE rides ADD CONSTRAINT fare_must_be_4000 CHECK (fare_per_seat = 4000);
