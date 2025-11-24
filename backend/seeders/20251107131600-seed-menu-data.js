'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Define cafeterias
    const cafeterias = [
      'cafeteria-paul-caffe',
      'cafeteria-cafelater',
      'cafeteria-sironi-student-center',
      'cafeteria-sironi-humanity'
    ];

    // Define categories for each cafeteria
    const categories = [];
    const categoryNames = ['Beverage', 'Breakfast', 'Main Meal', 'Snack', 'Dessert', 'Side'];

    cafeterias.forEach(cafeteriaId => {
      categoryNames.forEach(categoryName => {
        categories.push({
          id: `${cafeteriaId}-${categoryName.toLowerCase().replace(' ', '-')}`,
          name: `${categoryName} - ${cafeteriaId.replace('cafeteria-', '').replace('-', ' ')}`,
          description: `${categoryName} items at ${cafeteriaId.replace('cafeteria-', '').replace('-', ' ')}`,
          cafeteria_id: cafeteriaId
        });
      });
    });

    // Insert categories
    await queryInterface.bulkInsert('categories', categories, {});

    // Define menu items
    const menuItems = [];
    const items = [
      { name: 'Coffee', description: 'Freshly brewed coffee', price: 50, category: 'Beverage', ingredients: 'Coffee beans, water, milk' },
      { name: 'Tea', description: 'Herbal tea', price: 40, category: 'Beverage', ingredients: 'Tea leaves, water, honey' },
      { name: 'Juice', description: 'Fresh orange juice', price: 60, category: 'Beverage', ingredients: 'Oranges, water, sugar' },
      { name: 'Pancakes', description: 'Fluffy pancakes with syrup', price: 80, category: 'Breakfast', ingredients: 'Flour, eggs, milk, syrup' },
      { name: 'Eggs', description: 'Scrambled eggs', price: 70, category: 'Breakfast', ingredients: 'Eggs, salt, butter' },
      { name: 'Burger', description: 'Beef burger with fries', price: 150, category: 'Main Meal', ingredients: 'Beef patty, bun, lettuce, tomato, fries' },
      { name: 'Pizza', description: 'Cheese pizza', price: 200, category: 'Main Meal', ingredients: 'Dough, cheese, tomato sauce, toppings' },
      { name: 'Fries', description: 'Crispy fries', price: 50, category: 'Snack', ingredients: 'Potatoes, oil, salt' },
      { name: 'Cookies', description: 'Chocolate chip cookies', price: 30, category: 'Snack', ingredients: 'Flour, chocolate chips, butter, sugar' },
      { name: 'Cake', description: 'Chocolate cake', price: 100, category: 'Dessert', ingredients: 'Flour, chocolate, eggs, sugar' },
      { name: 'Ice Cream', description: 'Vanilla ice cream', price: 80, category: 'Dessert', ingredients: 'Milk, cream, vanilla, sugar' },
      { name: 'Bread', description: 'Garlic bread', price: 40, category: 'Side', ingredients: 'Bread, garlic, butter' },
      { name: 'Salad', description: 'Fresh green salad', price: 60, category: 'Side', ingredients: 'Lettuce, tomatoes, cucumber, dressing' }
    ];

    cafeterias.forEach(cafeteriaId => {
      items.forEach((item, index) => {
        const categoryId = `${cafeteriaId}-${item.category.toLowerCase().replace(' ', '-')}`;
        menuItems.push({
          id: `${cafeteriaId}-${item.name.toLowerCase().replace(' ', '-')}`,
          name: item.name,
          description: item.description,
          price: item.price,
          image_url: `/${item.name.toLowerCase().replace(' ', '-')}.jpg`,
          category_id: categoryId,
          ingredients: item.ingredients,
          available: true,
          stock: 20,
          cafeteria_id: cafeteriaId,
          created_at: new Date()
        });
      });
    });

    // Insert menu items
    await queryInterface.bulkInsert('menu_items', menuItems, {});
  },

  async down(queryInterface, Sequelize) {
    // Remove menu items
    await queryInterface.bulkDelete('menu_items', null, {});

    // Remove categories
    await queryInterface.bulkDelete('categories', null, {});
  }
};