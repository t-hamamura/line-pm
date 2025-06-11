const { Client } = require('@notionhq/client');
require('dotenv').config();

// Notionクライアントの初期化
const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

const databaseId = process.env.NOTION_DATABASE_ID;

// プロジェクトの登録
const createProject = async (projectData) => {
  try {
    const response = await notion.pages.create({
      parent: {
        database_id: databaseId
      },
      properties: {
        'プロジェクト名': {
          title: [
            {
              text: {
                content: projectData.プロジェクト名
              }
            }
          ]
        },
        'ステータス': {
          select: {
            name: projectData.ステータス
          }
        },
        '種別': {
          select: {
            name: projectData.種別
          }
        },
        '優先度': {
          select: {
            name: projectData.優先度
          }
        },
        '期限': {
          date: {
            start: projectData.期限
          }
        },
        'フェーズ': {
          select: {
            name: projectData.フェーズ
          }
        },
        '担当者': {
          select: {
            name: projectData.担当者
          }
        },
        '成果物': {
          select: {
            name: projectData.成果物
          }
        },
        'レベル': {
          select: {
            name: projectData.レベル
          }
        }
      }
    });

    return response;
  } catch (error) {
    console.error('Error creating project in Notion:', error);
    throw error;
  }
};

// タスクの登録
const createTask = async (taskData, parentId) => {
  try {
    const response = await notion.pages.create({
      parent: {
        database_id: databaseId
      },
      properties: {
        'プロジェクト名': {
          title: [
            {
              text: {
                content: taskData.名称
              }
            }
          ]
        },
        'レベル': {
          select: {
            name: taskData.レベル
          }
        },
        '期限': {
          date: {
            start: taskData.開始目安,
            end: taskData.終了目安
          }
        },
        '担当者': {
          select: {
            name: taskData.担当
          }
        },
        '成果物': {
          select: {
            name: taskData.成果物
          }
        },
        '親タスク': {
          relation: [
            {
              id: parentId
            }
          ]
        }
      }
    });

    return response;
  } catch (error) {
    console.error('Error creating task in Notion:', error);
    throw error;
  }
};

// WBSの登録
const createWBS = async (wbsData) => {
  try {
    // プロジェクトの登録
    const project = await createProject(wbsData.プロジェクト);

    // サブタスクの登録
    const tasks = await Promise.all(
      wbsData.プロジェクト.サブタスク.map(task =>
        createTask(task, project.id)
      )
    );

    return {
      project,
      tasks
    };
  } catch (error) {
    console.error('Error creating WBS in Notion:', error);
    throw error;
  }
};

// データベースの検索
const searchDatabase = async (query) => {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'プロジェクト名',
        title: {
          contains: query
        }
      }
    });

    return response.results;
  } catch (error) {
    console.error('Error searching Notion database:', error);
    throw error;
  }
};

module.exports = {
  createProject,
  createTask,
  createWBS,
  searchDatabase
}; 