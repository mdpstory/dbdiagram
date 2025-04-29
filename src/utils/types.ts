export interface Field {
  name: string;
  type: string;
  isPrimary?: boolean;
  isRequired?: boolean;
  reference?: {
    direction: "to" | "from";
    tableName: string;
    fieldName: string;
  };
}

export interface TableData {
  name: string;
  position: { x: number; y: number };
  fields: Field[];
}

export interface Relationship {
  fromTable: string;
  fromField: string;
  toTable: string;
  toField: string;
  type: "one-to-many" | "many-to-one" | "one-to-one" | "many-to-many";
}
