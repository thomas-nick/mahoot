import type { Schema, Struct } from '@strapi/strapi';

export interface RoundLayoutHole extends Struct.ComponentSchema {
  collectionName: 'components_round_layout_holes';
  info: {
    description: 'A single hole inside a CourseLayout (par + optional distance).';
    displayName: 'Layout Hole';
    icon: 'circle';
  };
  attributes: {
    feet: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    notes: Schema.Attribute.String;
    number: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 36;
          min: 1;
        },
        number
      >;
    par: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 12;
          min: 1;
        },
        number
      >;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'round.layout-hole': RoundLayoutHole;
    }
  }
}
