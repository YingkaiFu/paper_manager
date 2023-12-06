import React from 'react';
import { Layout, Menu} from 'antd';


const Category = ({categorys,clickFoler}) => {
    return (
        <Menu
          mode="inline"
          defaultSelectedKeys={['1']}
          onClick={clickFoler}
          items={
            categorys.map((category) => ({
              key: category.path+"\\"+category.name,
              label: category.name,
            }),
          )}
        />
    )
}

export default Category;