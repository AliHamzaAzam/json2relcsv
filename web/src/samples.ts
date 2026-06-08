export interface SampleEntry {
  name: string;
  json: string;
}

/**
 * Preset JSON examples shown in the playground.
 * The first entry mirrors tests/sample.json exactly.
 */
export const SAMPLES: SampleEntry[] = [
  {
    name: 'Users / orders / hobbies (nested)',
    json: JSON.stringify(
      {
        users: [
          {
            name: 'Alice',
            age: 30,
            address: { street: '1 Main St', city: 'Springfield' },
            hobbies: ['reading', 'cycling'],
            orders: [
              { total: 49.99, status: 'shipped' },
              { total: 12.5, status: 'pending' },
            ],
          },
          {
            name: 'Bob',
            age: 25,
            address: { street: '99 Oak Ave', city: 'Shelbyville' },
            hobbies: ['gaming'],
            orders: [{ total: 7.0, status: 'delivered' }],
          },
        ],
      },
      null,
      2,
    ),
  },

  {
    name: 'Flat object',
    json: JSON.stringify(
      {
        id: 1,
        title: 'Hello, world!',
        published: true,
        score: 9.5,
      },
      null,
      2,
    ),
  },

  {
    name: 'Array of scalars',
    json: JSON.stringify(['alpha', 'beta', 'gamma'], null, 2),
  },

  {
    name: 'Products with tags (junction)',
    json: JSON.stringify(
      {
        products: [
          { name: 'Widget', price: 4.99, tags: ['sale', 'hardware'] },
          { name: 'Gadget', price: 19.99, tags: ['new'] },
        ],
      },
      null,
      2,
    ),
  },
];
